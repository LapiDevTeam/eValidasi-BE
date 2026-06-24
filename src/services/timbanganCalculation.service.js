'use strict';

/**
 * timbanganCalculation.service.js — Timbangan Calibration orchestration
 *
 * Ties the pure math engine (timbanganFormula.service) to the repository and
 * the existing Sertifikat-Bagian publish flow. Controllers call only this.
 *
 * Workflow (reproduced from TIMBANGAN.xls):
 *   1. Save session identity + sub-tests (pre-adjust, repeatability, points,
 *      eccentricity, hysteresis) in one transactional replace.
 *   2. Calculate per-point error + uncertainty, repeatability, LOP, hysteresis,
 *      and the overall conclusion; auto-derive II. IDENTITAS STANDAR.
 *   3. Publish per-point results into T_Kalibrasi_Sertifikat_Bagian.
 */

const sql = require('mssql');
const repo = require('../../repositories/timbangan-calibration.repository');
const formula = require('./timbanganFormula.service');
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

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

// ---------------------------------------------------------------------------
// SESSION CRUD
// ---------------------------------------------------------------------------

async function createSession(body, createdBy) {
  const sessionId = await repo.createSession({
    ...body,
    unit: body.unit || 'kg',
    status: 'DRAFT',
    created_by: createdBy || null,
  });
  return { sessionId };
}

async function updateSession(sessionId, body, updatedBy) {
  const existing = await repo.getSessionById(sessionId);
  if (!existing) throw httpError(`Session ${sessionId} not found.`, 404);
  const ok = await repo.updateSession(sessionId, {
    ...body,
    unit: body.unit || existing.unit || 'kg',
    updated_by: updatedBy || null,
  });
  return { updated: ok };
}

// ---------------------------------------------------------------------------
// SAVE WORKBOOK (all sub-tests in one transactional replace)
// ---------------------------------------------------------------------------

async function saveWorkbook(sessionId, payload = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    await repo.deleteResultsBySession(sessionId, transaction);
    await repo.deletePointsBySession(sessionId, transaction);
    await repo.deletePreadjustBySession(sessionId, transaction);
    await repo.deleteRepeatabilityBySession(sessionId, transaction);
    await repo.deleteEccentricityBySession(sessionId, transaction);
    await repo.deleteHysteresisBySession(sessionId, transaction);

    const counts = { points: 0, standards: 0, preadjust: 0, repeatability: 0, eccentricity: 0, hysteresis: 0 };

    // Pre-adjustment
    const preadjust = Array.isArray(payload.preadjust) ? payload.preadjust : [];
    for (let i = 0; i < preadjust.length; i += 1) {
      const r = preadjust[i];
      await repo.insertPreadjustRow(sessionId, {
        row_order: r.row_order ?? i + 1,
        at_no_id: r.at_no_id ?? null,
        konvensional_g: toNumberOrNull(r.konvensional_g) ?? 0,
        uut_reading: toNumberOrNull(r.uut_reading) ?? 0,
        zero_reading: toNumberOrNull(r.zero_reading) ?? 0,
      }, transaction);
      counts.preadjust += 1;
    }

    // Repeatability
    const repeatability = Array.isArray(payload.repeatability) ? payload.repeatability : [];
    for (let i = 0; i < repeatability.length; i += 1) {
      const r = repeatability[i];
      await repo.insertRepeatabilityRow(sessionId, {
        row_no: r.row_no ?? i + 1,
        half_zero: toNumberOrNull(r.half_zero) ?? 0,
        half_reading: toNumberOrNull(r.half_reading) ?? 0,
        max_zero: toNumberOrNull(r.max_zero) ?? 0,
        max_reading: toNumberOrNull(r.max_reading) ?? 0,
      }, transaction);
      counts.repeatability += 1;
    }

    // Points + standards
    const points = Array.isArray(payload.points) ? payload.points : [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const pointId = await repo.createPoint(sessionId, {
        point_order: p.point_order ?? i + 1,
        unit: p.unit || session.unit || 'kg',
        is_active: true,
      }, transaction);
      counts.points += 1;

      const standards = Array.isArray(p.standards) ? p.standards : [];
      for (let s = 0; s < standards.length; s += 1) {
        const st = standards[s];
        await repo.insertPointStandard(sessionId, pointId, {
          row_order: st.row_order ?? s + 1,
          at_no_id: st.at_no_id ?? null,
          konvensional_g: toNumberOrNull(st.konvensional_g) ?? 0,
          uc_mg: toNumberOrNull(st.uc_mg) ?? 0,
          uut_reading: toNumberOrNull(st.uut_reading) ?? 0,
          zero_reading: toNumberOrNull(st.zero_reading) ?? 0,
        }, transaction);
        counts.standards += 1;
      }
    }

    // Eccentricity
    const eccentricity = Array.isArray(payload.eccentricity) ? payload.eccentricity : [];
    for (let i = 0; i < eccentricity.length; i += 1) {
      const r = eccentricity[i];
      await repo.insertEccentricityRow(sessionId, {
        position: r.position ?? i,
        baca1: toNumberOrNull(r.baca1) ?? 0,
        baca2: toNumberOrNull(r.baca2) ?? 0,
      }, transaction);
      counts.eccentricity += 1;
    }

    // Hysteresis
    const hysteresis = Array.isArray(payload.hysteresis) ? payload.hysteresis : [];
    for (let i = 0; i < hysteresis.length; i += 1) {
      const r = hysteresis[i];
      await repo.insertHysteresisRow(sessionId, {
        row_order: r.row_order ?? i + 1,
        label: r.label ?? null,
        col1: toNumberOrNull(r.col1),
        col2: toNumberOrNull(r.col2),
      }, transaction);
      counts.hysteresis += 1;
    }

    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return counts;
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// STANDARD IDENTITY DERIVATION (II. IDENTITAS STANDAR)
// ---------------------------------------------------------------------------

function uniqueClean(values) {
  const seen = new Set();
  const out = [];
  values.forEach((raw) => {
    const v = String(raw ?? '').trim().replace(/[;,]\s*$/, '').trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}

/**
 * Build the certificate "II. IDENTITAS STANDAR" strings from the AT weights
 * used across all points (+ pre-adjustment), looked up against the AT master.
 */
function deriveStandardIdentity(usedNoIds, atMap) {
  const rows = uniqueClean(usedNoIds)
    .map((noId) => atMap.get(String(noId).trim()))
    .filter(Boolean);

  if (!rows.length) {
    return { std_nama: '', std_no_identitas: '', std_no_sertifikat: '', std_tertelusur: '', std_rekalibrasi: '' };
  }

  const ids = uniqueClean(rows.map((r) => r.no_id_label || r.no_id));
  const kelas = uniqueClean(rows.map((r) => r.kelas));
  const sertifikat = uniqueClean(rows.map((r) => r.no_sertifikat));
  const tertelusur = uniqueClean(rows.map((r) => r.tertelusur));
  const rekal = uniqueClean(rows.map((r) => r.rekalibrasi));

  return {
    std_nama: kelas.length ? `AT Standar ${kelas.join(', ')}` : 'AT Standar',
    std_no_identitas: `AT (${ids.join(', ')})`,
    std_no_sertifikat: sertifikat.join(', '),
    std_tertelusur: tertelusur.join(', '),
    std_rekalibrasi: rekal.join(', '),
  };
}

// ---------------------------------------------------------------------------
// CALCULATE
// ---------------------------------------------------------------------------

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const points = await repo.listPoints(sessionId, transaction);
    if (!points.length) {
      throw httpError('No measurement points found.', 422, [{ field: 'points', message: 'Add at least one measurement point.' }]);
    }

    const pointStandards = await repo.listPointStandards(sessionId, transaction);
    const repeatabilityRows = await repo.listRepeatability(sessionId, transaction);
    const preadjustRows = await repo.listPreadjust(sessionId, transaction);
    const eccentricityRows = await repo.listEccentricity(sessionId, transaction);
    const hysteresisRows = await repo.listHysteresis(sessionId, transaction);

    const resolusi = toNumberOrNull(session.resolusi) ?? 0;

    const standardsByPoint = new Map();
    for (const s of pointStandards) {
      if (!standardsByPoint.has(s.point_id)) standardsByPoint.set(s.point_id, []);
      standardsByPoint.get(s.point_id).push(s);
    }

    const rep = formula.computeRepeatability(repeatabilityRows, resolusi);
    const maxLoadRef = rep.avgMaxReading
      || toNumberOrNull(session.kapasitas_alat)
      || toNumberOrNull(session.kapasitas_ukur)
      || 0;

    await repo.deleteResultsBySession(sessionId, transaction);

    const resultRows = [];
    const computedForLop = [];
    let maxExpanded = 0;

    for (const point of points) {
      const standards = standardsByPoint.get(point.point_id) || [];
      const c = formula.computePoint({ standards, resolusi, repeatability: rep, maxLoadRef });
      maxExpanded = Math.max(maxExpanded, c.uExpanded);
      computedForLop.push({ error: c.error, uExpanded: c.uExpanded });

      const row = {
        session_id: sessionId,
        point_id: point.point_id,
        point_order: point.point_order,
        unit: point.unit,
        konv_mass: c.konvMass,
        reading: c.reading,
        error: c.error,
        u_repeatability: c.uRepeatability,
        u_resolusi: c.uResolusi,
        u_sertifikat: c.uSertifikat,
        u_combined: c.uCombined,
        u_expanded: c.uExpanded,
        tolerance: c.tolerance,
        pass_flag: c.passFlag,
      };
      await repo.insertResult(row, transaction);
      resultRows.push(row);
    }

    const preadjust = formula.computePreadjust(preadjustRows);
    const eccentricity = formula.computeEccentricity(eccentricityRows);
    const hysteresis = formula.computeHysteresis(hysteresisRows);
    const lop = formula.computeLop({ srHalf: rep.srHalf, srMax: rep.srMax, results: computedForLop });
    const conclusion = formula.deriveConclusion(resultRows.map((r) => ({ passFlag: r.pass_flag })));

    await repo.upsertSummary(sessionId, {
      sr_half: rep.srHalf,
      sr_max: rep.srMax,
      sres: rep.sres,
      k_half: rep.kHalf,
      k_max: rep.kMax,
      avg_half_zero: rep.avgHalfZero,
      avg_half_reading: rep.avgHalfReading,
      avg_max_zero: rep.avgMaxZero,
      avg_max_reading: rep.avgMaxReading,
      preadjust_result: preadjust.result,
      preadjust_error: preadjust.error,
      eccentricity_max: eccentricity.maxDiff,
      hysteresis,
      cmax: lop.cmax,
      u_cmax: lop.uCmax,
      sr_max_used: lop.srMaxUsed,
      lop: lop.lop,
      coverage_factor: formula.COVERAGE_FACTOR,
      max_expanded: maxExpanded,
      conclusion,
    }, transaction);

    await repo.updateSessionConclusion(sessionId, conclusion, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);

    // Auto-derive II. IDENTITAS STANDAR and pre-fill only empty fields.
    const usedNoIds = [
      ...pointStandards.map((s) => s.at_no_id),
      ...preadjustRows.map((r) => r.at_no_id),
    ].filter((v) => !isBlank(v));
    if (usedNoIds.length) {
      const atList = await repo.listAtStandards({}, transaction);
      const atMap = new Map(atList.map((a) => [String(a.no_id).trim(), a]));
      const derived = deriveStandardIdentity(usedNoIds, atMap);
      const patch = {};
      if (isBlank(session.std_nama)) patch.std_nama = derived.std_nama;
      if (isBlank(session.std_no_identitas)) patch.std_no_identitas = derived.std_no_identitas;
      if (isBlank(session.std_no_sertifikat)) patch.std_no_sertifikat = derived.std_no_sertifikat;
      if (isBlank(session.std_tertelusur)) patch.std_tertelusur = derived.std_tertelusur;
      if (isBlank(session.std_rekalibrasi)) patch.std_rekalibrasi = derived.std_rekalibrasi;
      if (Object.keys(patch).length) {
        await repo.updateSession(sessionId, { ...session, ...patch, updated_by: changedBy }, transaction);
      }
    }

    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'timbangan_calculate',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ points: resultRows.length, conclusion }),
      changed_by: changedBy,
    }, transaction).catch(() => { /* audit optional */ });

    await transaction.commit();

    return {
      sessionId,
      conclusion,
      coverageFactor: formula.COVERAGE_FACTOR,
      maxExpanded,
      points: resultRows,
      repeatability: rep,
      preadjust,
      eccentricity,
      hysteresis,
      lop,
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

  const [points, pointStandards, preadjust, repeatability, eccentricity, hysteresis, results, summary] =
    await Promise.all([
      repo.listPoints(sessionId),
      repo.listPointStandards(sessionId),
      repo.listPreadjust(sessionId),
      repo.listRepeatability(sessionId),
      repo.listEccentricity(sessionId),
      repo.listHysteresis(sessionId),
      repo.getResults(sessionId),
      repo.getSummary(sessionId),
    ]);

  const stdByPoint = new Map();
  for (const s of pointStandards) {
    if (!stdByPoint.has(s.point_id)) stdByPoint.set(s.point_id, []);
    stdByPoint.get(s.point_id).push(s);
  }
  const pointsWithStandards = points.map((p) => ({
    ...p,
    standards: (stdByPoint.get(p.point_id) || []).sort((a, b) => a.row_order - b.row_order),
  }));

  return { session, points: pointsWithStandards, preadjust, repeatability, eccentricity, hysteresis, results, summary };
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
// AT MASTER + DA CANDIDATES
// ---------------------------------------------------------------------------

async function listAtStandards(filters) {
  return repo.listAtStandards(filters);
}

async function lookupAt(noId) {
  const at = await repo.getAtByNoId(noId);
  if (!at) throw httpError(`Anak Timbangan ${noId} not found.`, 404);
  return at;
}

async function listDaCandidates(filters) {
  return repo.listTimbanganDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTimbanganDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) throw httpError(`QA_ID ${explicitQaId} not found in DA Bagian.`, 404);
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTimbanganDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listTimbanganDaCandidates({ instrument_code: instrumentCode }, transaction);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      throw httpError('Multiple DA candidates found. Please choose qa_id explicitly.', 422, [
        { field: 'qa_id', message: `Candidates: ${candidates.map((c) => c.QA_ID).join(', ')}` },
      ]);
    }
  }
  throw httpError('Cannot resolve QA_ID. Provide qa_id explicitly in publish request.', 422, [
    { field: 'qa_id', message: 'No single DA Bagian match for this session.' },
  ]);
}

function buildSuhuKelembabanText(session, explicit) {
  if (explicit) return String(explicit);
  const t = toNumberOrNull(session.temperature);
  const h = toNumberOrNull(session.humidity);
  if (t === null && h === null) return '';
  return `${t ?? '-'}°C / ${h ?? '-'}%rH`;
}

// ---------------------------------------------------------------------------
// PUBLISH -> Sertifikat-Bagian
// ---------------------------------------------------------------------------

async function publishToSertifikat(sessionId, changedBy = null, delegatedTo = null, options = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'FINALIZED', 'PUBLISHED'].includes(status)) {
      throw httpError('Session must be CALCULATED before publish.', 422, [
        { field: 'status', message: `Current status is ${status || 'UNKNOWN'}.` },
      ]);
    }

    const results = await repo.getResults(sessionId, transaction);
    if (!results.length) throw httpError('No calculation results. Run calculate first.', 422);

    const qaCandidate = await resolveQaCandidate(session, options.qa_id || options.qaId, transaction);
    const qaId = String(qaCandidate.QA_ID);
    const actor = changedBy || 'SYSTEM';
    const delegatedActor = delegatedTo || actor;

    // Nomor sertifikat — kode huruf mengikuti tabel acuan parameter kalibrasi
    // (Timbangan = M -> dbo.fnGetKal_Ser_M_No_ID). Lihat src/constants/certificateTypeCodes.js
    let idNoSertifikat = String(options.id_no_sertifikat || options.idNoSertifikat || session.id_no_sertifikat || '').trim();
    if (!idNoSertifikat) {
      const certCode = getCertificateTypeCode(qaCandidate.Parameter_Sertifikasi) || 'M';
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) throw httpError('Failed to generate certificate number.', 500);
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromTimbanganDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
      if (!inserted) {
        throw httpError(`Failed to create sertifikat draft from DA for QA_ID ${qaId}.`, 422, [
          { field: 'qa_id', message: `DA Bagian record not found for QA_ID ${qaId}.` },
        ]);
      }
      createdDraft = true;
      header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    }
    if (!header) throw httpError(`Sertifikat header not found for QA_ID ${qaId} / ${idNoSertifikat}.`, 404);

    const metode = options.metode_kalibrasi
      || session.metode_kalibrasi
      || (await repo.getMetodeKalibrasi(transaction))
      || 'Kalibrasi Timbangan - Workbook';
    const finalInterval = toPositiveIntegerOrNull(options.interval)
      || toPositiveIntegerOrNull(session.interval_bulan)
      || toPositiveIntegerOrNull(header.Interval)
      || 12;
    const finalTglKalibrasi = toDateOrNull(options.tgl_kalibrasi) || toDateOrNull(session.calibration_date) || new Date();

    const headerPayload = {
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      assm_nama_instrumen: options.assm_nama_instrumen ?? session.instrument_name ?? header.Assm_nama_instrumen ?? '',
      assm_no_identitas_kalibrasi: options.assm_no_identitas_kalibrasi ?? session.instrument_code ?? header.Assm_No_identitas_kalibrasi ?? '',
      assm_kapasitas: options.assm_kapasitas ?? session.kapasitas_resolusi ?? header.Assm_Kapasitas ?? '',
      assm_lokasi: options.assm_lokasi ?? session.lokasi ?? header.Assm_Lokasi ?? '',
      nama: options.nama ?? session.std_nama ?? header.Nama ?? '',
      no_ident_no_batch: options.no_ident_no_batch ?? session.std_no_identitas ?? header.No_Ident_No_batch ?? '',
      no_sertifikat: options.no_sertifikat ?? session.std_no_sertifikat ?? header.No_Sertifikat ?? '',
      tertelusur_melalui: options.tertelusur_melalui ?? session.std_tertelusur ?? header.Tertelusur_melalui ?? '',
      rekalibrasi: options.rekalibrasi ?? session.std_rekalibrasi ?? header.Rekalibrasi ?? '',
      tgl_kalibrasi: finalTglKalibrasi,
      interval: finalInterval,
      metode_kalibrasi: metode,
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    };
    const updatedHeader = await repo.updateSertifikatBagianHeader(headerPayload, transaction);
    if (!updatedHeader) throw httpError('Failed to update sertifikat header.', 500);

    const sorted = [...results].sort((a, b) => Number(a.point_order) - Number(b.point_order));
    const publishRows = sorted.map((row, index) => ({
      seq_id: index + 1,
      pembacaan_alat: toNumberOrNull(row.reading) ?? 0,
      pembacaan_standar: toNumberOrNull(row.konv_mass) ?? 0,
      error: toNumberOrNull(row.error) ?? 0,
      ketidakpastian: toNumberOrNull(row.u_expanded) ?? 0,
    }));

    await repo.replaceSertifikatBagianHasilKalRows(qaId, idNoSertifikat, publishRows, actor, delegatedActor, transaction);

    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);

    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'timbangan_publish_sertifikat',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ qa_id: qaId, id_no_sertifikat: idNoSertifikat, rows: publishRows.length }),
      changed_by: actor,
    }, transaction).catch(() => { /* audit optional */ });

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
  createSession,
  updateSession,
  saveWorkbook,
  calculate,
  getSessionBundle,
  getResults,
  finalize,
  listAtStandards,
  lookupAt,
  listDaCandidates,
  publishToSertifikat,
};
