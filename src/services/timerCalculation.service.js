'use strict';

/**
 * timerCalculation.service.js  –  Timer Calibration orchestration
 *
 * Ties the pure math engine (timerFormula.service) to the repository and the
 * existing Sertifikat-Bagian publish flow. Controllers call only this service.
 *
 * Workflow reproduced from the TIMER workbook:
 *   1. Save session identity + measurement points + 10-cycle readings
 *   2. Calculate per-point mean error, SD and the 4-component uncertainty budget
 *   3. Evaluate every point against tolerance -> LAYAK / TIDAK LAYAK DIGUNAKAN
 *   4. Publish the results into T_Kalibrasi_Sertifikat_Bagian (Hasil Kalibrasi)
 */

const sql = require('mssql');
const repo = require('../../repositories/timer-calibration.repository');
const formula = require('./timerFormula.service');
const { getCertificateTypeCode } = require('../constants/certificateTypeCodes');

function httpError(message, statusCode = 400, validation) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (validation) err.validation = validation;
  return err;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toPositiveIntegerOrNull(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Manual evaluation verdict — three canonical options, identical wording to the
// Thermohygrometer / Friability workbook. The technician picks this manually;
// the computed `conclusion` is only a suggestion. Anything else is coerced to ''.
const EVALUATION_OPTIONS = [
  'Layak digunakan',
  'Tidak layak digunakan',
  'Penggunaan faktor koreksi',
];

function normalizeEvaluationResult(value) {
  const text = String(value ?? '').trim();
  return EVALUATION_OPTIONS.includes(text) ? text : '';
}

// ---------------------------------------------------------------------------
// SESSION CRUD passthroughs (with light validation)
// ---------------------------------------------------------------------------

function validateSessionInput(body) {
  const errors = [];
  const unitMode = String(body.unit_mode || 'DETIK').toUpperCase();
  if (!['DETIK', 'MENIT'].includes(unitMode)) {
    errors.push({ field: 'unit_mode', message: 'unit_mode must be DETIK or MENIT.' });
  }
  const indicator = String(body.indicator_type || 'DIGITAL').toUpperCase();
  if (!['DIGITAL', 'ANALOG'].includes(indicator)) {
    errors.push({ field: 'indicator_type', message: 'indicator_type must be DIGITAL or ANALOG.' });
  }
  return errors;
}

async function createSession(body, createdBy) {
  const errors = validateSessionInput(body);
  if (errors.length) throw httpError('Validation failed', 422, errors);

  const sessionId = await repo.createSession({
    ...body,
    unit_mode: String(body.unit_mode || 'DETIK').toUpperCase(),
    indicator_type: String(body.indicator_type || 'DIGITAL').toUpperCase(),
    evaluation_result: normalizeEvaluationResult(body.evaluation_result) || null,
    status: 'DRAFT',
    created_by: createdBy || null,
  });
  return { sessionId };
}

async function updateSession(sessionId, body, updatedBy) {
  const errors = validateSessionInput(body);
  if (errors.length) throw httpError('Validation failed', 422, errors);

  const existing = await repo.getSessionById(sessionId);
  if (!existing) throw httpError(`Session ${sessionId} not found.`, 404);

  const ok = await repo.updateSession(sessionId, {
    ...body,
    unit_mode: String(body.unit_mode || existing.unit_mode || 'DETIK').toUpperCase(),
    indicator_type: String(body.indicator_type || existing.indicator_type || 'DIGITAL').toUpperCase(),
    evaluation_result:
      body.evaluation_result !== undefined
        ? normalizeEvaluationResult(body.evaluation_result) || null
        : existing.evaluation_result || null,
    updated_by: updatedBy || null,
  });
  return { updated: ok };
}

// ---------------------------------------------------------------------------
// SAVE WORKBOOK (points + readings in one transactional replace)
// ---------------------------------------------------------------------------

/**
 * Replace all measurement points and their cycle readings for a session.
 * @param {number} sessionId
 * @param {Array}  points  [{ point_order, nominal_value, unit, correction_std, uc_std,
 *                            cycles: [{ cycle_no, std_jam, std_menit, ... }] }]
 */
async function saveWorkbook(sessionId, points = []) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    await repo.deleteResultsBySession(sessionId, transaction);
    await repo.deletePointsBySession(sessionId, transaction);

    let pointCount = 0;
    let readingCount = 0;

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const pointId = await repo.createPoint(
        sessionId,
        {
          point_order: p.point_order ?? i + 1,
          nominal_value: toNumberOrNull(p.nominal_value) ?? 0,
          unit: String(p.unit || session.unit_mode || 'DETIK').toUpperCase(),
          correction_std: toNumberOrNull(p.correction_std) ?? 0,
          uc_std: toNumberOrNull(p.uc_std) ?? 0,
          is_active: true,
        },
        transaction
      );
      pointCount += 1;

      const cycles = Array.isArray(p.cycles) ? p.cycles : [];
      for (let c = 0; c < cycles.length; c += 1) {
        const cy = cycles[c];
        await repo.insertReading(
          sessionId,
          pointId,
          {
            cycle_no: cy.cycle_no ?? c + 1,
            std_jam: toNumberOrNull(cy.std_jam) ?? 0,
            std_menit: toNumberOrNull(cy.std_menit) ?? 0,
            std_detik: toNumberOrNull(cy.std_detik) ?? 0,
            std_mdetik: toNumberOrNull(cy.std_mdetik) ?? 0,
            uut_jam: toNumberOrNull(cy.uut_jam) ?? 0,
            uut_menit: toNumberOrNull(cy.uut_menit) ?? 0,
            uut_detik: toNumberOrNull(cy.uut_detik) ?? 0,
            uut_mdetik: toNumberOrNull(cy.uut_mdetik) ?? 0,
          },
          transaction
        );
        readingCount += 1;
      }
    }

    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return { pointCount, readingCount };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// CALCULATE
// ---------------------------------------------------------------------------

function groupReadingsByPoint(readings) {
  const map = new Map();
  for (const r of readings) {
    if (!map.has(r.point_id)) map.set(r.point_id, []);
    map.get(r.point_id).push(r);
  }
  return map;
}

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const points = await repo.listPoints(sessionId, transaction);
    if (!points.length) throw httpError('No measurement points found.', 422, [{ field: 'points', message: 'Add at least one measurement point.' }]);

    const readings = await repo.listReadings(sessionId, transaction);
    const byPoint = groupReadingsByPoint(readings);

    const tolerance = toNumberOrNull(session.tolerance);
    const digitalRes = toNumberOrNull(session.digital_resolution) ?? 0;
    const analogRes = toNumberOrNull(session.analog_resolution) ?? 0;

    await repo.deleteResultsBySession(sessionId, transaction);

    const resultRows = [];
    let allPass = true;
    let anyEvaluated = false;
    let maxExpanded = 0;

    for (const point of points) {
      const pointReadings = byPoint.get(point.point_id) || [];
      const computed = formula.computePoint({
        correctionStd: toNumberOrNull(point.correction_std) ?? 0,
        ucStd: toNumberOrNull(point.uc_std) ?? 0,
        digitalRes,
        analogRes,
        readings: pointReadings,
      });

      const evalResult = formula.evaluatePoint(
        computed.meanErrorSec,
        computed.uExpandedSec,
        tolerance
      );
      if (evalResult.pass !== null) {
        anyEvaluated = true;
        if (!evalResult.pass) allPass = false;
      }
      maxExpanded = Math.max(maxExpanded, computed.uExpandedSec);

      const row = {
        session_id: sessionId,
        point_id: point.point_id,
        point_order: point.point_order,
        nominal_value: point.nominal_value,
        unit: point.unit,
        mean_std_sec: computed.meanStdSec,
        mean_uut_sec: computed.meanUutSec,
        mean_error_sec: computed.meanErrorSec,
        sd_sec: computed.sdSec,
        u_repeatability: computed.uRepeatability,
        u_digital_res: computed.uDigitalRes,
        u_analog_res: computed.uAnalogRes,
        u_certificate: computed.uCertificate,
        u_combined: computed.uCombined,
        u_expanded_sec: computed.uExpandedSec,
        u_expanded_menit: computed.uExpandedMenit,
        tolerance,
        pass_flag: evalResult.pass,
      };
      await repo.insertResult(row, transaction);
      resultRows.push(row);
    }

    const conclusion = !anyEvaluated
      ? null
      : allPass
        ? 'LAYAK DIGUNAKAN'
        : 'TIDAK LAYAK DIGUNAKAN';

    await repo.upsertSummary(
      sessionId,
      {
        coverage_factor: formula.COVERAGE_FACTOR,
        max_expanded_sec: maxExpanded,
        conclusion,
      },
      transaction
    );
    await repo.updateSessionConclusion(sessionId, conclusion, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'timer_calculate',
        entity_id: null,
        action_type: 'UPDATE',
        old_value: null,
        new_value: JSON.stringify({ points: resultRows.length, conclusion }),
        changed_by: changedBy,
      },
      transaction
    ).catch(() => { /* audit table optional */ });

    await transaction.commit();

    return {
      sessionId,
      conclusion,
      coverageFactor: formula.COVERAGE_FACTOR,
      maxExpandedSec: maxExpanded,
      points: resultRows,
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// READ BUNDLE
// ---------------------------------------------------------------------------

async function getSessionBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  const [points, readings, results, summary] = await Promise.all([
    repo.listPoints(sessionId),
    repo.listReadings(sessionId),
    repo.getResults(sessionId),
    repo.getSummary(sessionId),
  ]);

  // Nest readings under their point for the grid UI.
  const readingsByPoint = new Map();
  for (const r of readings) {
    if (!readingsByPoint.has(r.point_id)) readingsByPoint.set(r.point_id, []);
    readingsByPoint.get(r.point_id).push(r);
  }
  const pointsWithCycles = points.map((p) => ({
    ...p,
    cycles: (readingsByPoint.get(p.point_id) || []).sort((a, b) => a.cycle_no - b.cycle_no),
  }));

  return { session, points: pointsWithCycles, results, summary };
}

async function getResults(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const results = await repo.getResults(sessionId);
  const summary = await repo.getSummary(sessionId);
  return { sessionId, results, summary };
}

// ---------------------------------------------------------------------------
// FINALIZE
// ---------------------------------------------------------------------------

async function finalize(sessionId, changedBy = null) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  if (String(session.status).toUpperCase() !== 'CALCULATED') {
    throw httpError('Session must be CALCULATED before finalize.', 422, [
      { field: 'status', message: `Current status is ${session.status}.` },
    ]);
  }
  await repo.updateSessionStatus(sessionId, 'FINALIZED', changedBy);
  return { sessionId, status: 'FINALIZED' };
}

// ---------------------------------------------------------------------------
// DA CANDIDATES
// ---------------------------------------------------------------------------

async function listDaCandidates(filters) {
  return repo.listTimerDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTimerDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) {
      throw httpError(
        `Instrumen dengan QA_ID "${explicitQaId}" tidak ditemukan di data Asesmen DA Bagian. ` +
          'Periksa kembali pilihan instrumen melalui "Browse Instrument".',
        404,
        [{ field: 'qa_id', message: `QA_ID ${explicitQaId} tidak ada di T_Kalibrasi_DA_Bagian.` }]
      );
    }
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTimerDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listTimerDaCandidates({ instrument_code: instrumentCode }, transaction);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      throw httpError(
        'Ditemukan lebih dari satu instrumen Asesmen DA yang cocok untuk sesi ini. ' +
          'Pilih satu instrumen lewat "Browse Instrument" agar QA_ID spesifik sebelum menerbitkan sertifikat.',
        422,
        [{ field: 'qa_id', message: `Kandidat QA_ID: ${candidates.map((c) => c.QA_ID).join(', ')}.` }]
      );
    }
  }
  throw httpError(
    'Instrumen kalibrasi (QA_ID) tidak bisa ditentukan otomatis untuk sesi ini. ' +
      'Pilih instrumen lewat "Browse Instrument" agar QA_ID terisi, atau pastikan instrumen ini sudah ' +
      'memiliki data Asesmen DA Bagian terlebih dahulu.',
    422,
    [{ field: 'qa_id', message: 'Tidak ada satu pun record Asesmen DA Bagian yang cocok dengan sesi ini.' }]
  );
}

function buildSuhuKelembabanText(session, explicit) {
  if (explicit) return String(explicit);
  const t = toNumberOrNull(session.temperature);
  const h = toNumberOrNull(session.humidity);
  if (t === null && h === null) return '';
  return `${t ?? '-'} °C / ${h ?? '-'} %RH`;
}

// ---------------------------------------------------------------------------
// PUBLISH -> Sertifikat-Bagian  (mirrors calibrationCalculation.service)
// ---------------------------------------------------------------------------

async function publishToSertifikat(sessionId, changedBy = null, delegatedTo = null, options = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) {
      throw httpError(
        `Sesi kalibrasi #${sessionId} tidak ditemukan. Sesi mungkin sudah dihapus — muat ulang daftar sesi lalu pilih kembali.`,
        404
      );
    }

    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'FINALIZED', 'PUBLISHED'].includes(status)) {
      throw httpError(
        'Sertifikat belum bisa diterbitkan karena sesi ini belum dihitung. ' +
          'Jalankan "Hitung" sampai status menjadi CALCULATED, lalu terbitkan ulang.',
        422,
        [{ field: 'status', message: `Status sesi saat ini: ${status || 'TIDAK DIKETAHUI'}.` }]
      );
    }

    const results = await repo.getResults(sessionId, transaction);
    if (!results.length) {
      throw httpError(
        'Belum ada hasil perhitungan untuk sesi ini. Jalankan "Hitung" terlebih dahulu sebelum menerbitkan sertifikat.',
        422,
        [{ field: 'status', message: 'Tabel hasil (timer_results) masih kosong.' }]
      );
    }

    // Kesimpulan kelayakan dipilih manual oleh teknisi (bukan verdict otomatis).
    // Wajib dipilih sebelum sertifikat diterbitkan — mengikuti pola workbook Thermohygrometer.
    if (!normalizeEvaluationResult(session.evaluation_result)) {
      throw httpError(
        'Hasil evaluasi (kesimpulan) belum dipilih. Buka tab "Hasil & Evaluasi", pilih salah satu ' +
          'kesimpulan (Layak digunakan / Tidak layak digunakan / Penggunaan faktor koreksi), lalu terbitkan ulang.',
        422,
        [{ field: 'evaluation_result', message: 'Hasil evaluasi manual belum dipilih.' }]
      );
    }

    const qaCandidate = await resolveQaCandidate(session, options.qa_id || options.qaId, transaction);
    const qaId = String(qaCandidate.QA_ID);
    const actor = changedBy || 'SYSTEM';
    const delegatedActor = delegatedTo || actor;

    // Nomor sertifikat — kode huruf mengikuti tabel acuan parameter kalibrasi
    // (Timer = R -> dbo.fnGetKal_Ser_R_No_ID). Lihat src/constants/certificateTypeCodes.js
    let idNoSertifikat = String(options.id_no_sertifikat || options.idNoSertifikat || session.id_no_sertifikat || '').trim();
    if (!idNoSertifikat) {
      const certCode = getCertificateTypeCode(qaCandidate.Parameter_Sertifikasi) || 'R';
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) {
        throw httpError(
          'Nomor sertifikat gagal dibuat otomatis. Coba lagi beberapa saat; bila tetap gagal, hubungi administrator sistem.',
          500
        );
      }
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromTimerDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
      if (!inserted) {
        throw httpError(
          `Gagal membuat draft sertifikat: belum ada data Asesmen DA untuk instrumen ini (QA_ID ${qaId}). ` +
            'Lakukan Asesmen DA atas instrumen ini terlebih dahulu, baru terbitkan sertifikat.',
          422,
          [{ field: 'qa_id', message: `Tidak ada record Asesmen DA Bagian untuk QA_ID ${qaId}.` }]
        );
      }
      createdDraft = true;
      header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    }
    if (!header) {
      throw httpError(
        `Header sertifikat tidak ditemukan untuk QA_ID ${qaId} (nomor ${idNoSertifikat}). ` +
          'Coba ulangi penerbitan; bila tetap gagal, hubungi administrator sistem.',
        404
      );
    }

    const finalInterval = toPositiveIntegerOrNull(options.interval) || toPositiveIntegerOrNull(header.Interval) || 12;
    const finalTglKalibrasi = toDateOrNull(options.tgl_kalibrasi) || toDateOrNull(session.calibration_date) || new Date();

    const headerPayload = {
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      assm_nama_instrumen: options.assm_nama_instrumen ?? session.instrument_name ?? header.Assm_nama_instrumen ?? '',
      assm_no_identitas_kalibrasi: options.assm_no_identitas_kalibrasi ?? session.instrument_code ?? header.Assm_No_identitas_kalibrasi ?? '',
      assm_kapasitas: options.assm_kapasitas ?? session.kapasitas ?? header.Assm_Kapasitas ?? '',
      assm_lokasi: options.assm_lokasi ?? session.lokasi ?? header.Assm_Lokasi ?? '',
      nama: options.nama ?? session.std_nama ?? header.Nama ?? '',
      no_ident_no_batch: options.no_ident_no_batch ?? session.std_no_identitas ?? header.No_Ident_No_batch ?? '',
      no_sertifikat: options.no_sertifikat ?? session.std_no_sertifikat ?? header.No_Sertifikat ?? '',
      tertelusur_melalui: options.tertelusur_melalui ?? session.std_tertelusur ?? header.Tertelusur_melalui ?? '',
      rekalibrasi: options.rekalibrasi ?? session.std_rekalibrasi ?? header.Rekalibrasi ?? '',
      tgl_kalibrasi: finalTglKalibrasi,
      interval: finalInterval,
      metode_kalibrasi: options.metode_kalibrasi ?? session.metode_kalibrasi ?? 'Kalibrasi Timer - Workbook',
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    };
    const updatedHeader = await repo.updateSertifikatBagianHeader(headerPayload, transaction);
    if (!updatedHeader) {
      throw httpError(
        'Gagal menyimpan data header sertifikat. Coba ulangi penerbitan; bila tetap gagal, hubungi administrator sistem.',
        500
      );
    }

    // Hasil Kalibrasi rows: per point -> Pembacaan Alat / Standar / Error / Ketidakpastian
    const sorted = [...results].sort((a, b) => Number(a.point_order) - Number(b.point_order));
    const publishRows = sorted.map((row, index) => ({
      seq_id: index + 1,
      pembacaan_alat: toNumberOrNull(row.mean_uut_sec) ?? 0,
      pembacaan_standar: toNumberOrNull(row.mean_std_sec) ?? 0,
      error: toNumberOrNull(row.mean_error_sec) ?? 0,
      ketidakpastian: toNumberOrNull(row.u_expanded_sec) ?? 0,
    }));

    await repo.replaceSertifikatBagianHasilKalRows(qaId, idNoSertifikat, publishRows, actor, delegatedActor, transaction);

    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'timer_publish_sertifikat',
        entity_id: null,
        action_type: 'UPDATE',
        old_value: null,
        new_value: JSON.stringify({ qa_id: qaId, id_no_sertifikat: idNoSertifikat, rows: publishRows.length }),
        changed_by: actor,
      },
      transaction
    ).catch(() => { /* audit optional */ });

    await transaction.commit();

    return {
      success: true,
      session_id: sessionId,
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      created_new_sertifikat: createdDraft,
      published_rows: publishRows.length,
      certificate_source: 'T_Kalibrasi_Sertifikat_Bagian',
      print_data_endpoint: `/transactions/kalibrasi/sertifikat-bagian/print-data?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

module.exports = {
  EVALUATION_OPTIONS,
  normalizeEvaluationResult,
  createSession,
  updateSession,
  saveWorkbook,
  calculate,
  getSessionBundle,
  getResults,
  finalize,
  listDaCandidates,
  publishToSertifikat,
};
