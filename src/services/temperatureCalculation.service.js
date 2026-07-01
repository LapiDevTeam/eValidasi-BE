'use strict';

const sql = require('mssql');
const repo = require('../../repositories/temperature-calibration.repository');
const formula = require('./temperatureFormula.service');
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
// Thermohygrometer / Friability / Timer workbook. Picked manually; the computed
// `conclusion` is only a suggestion.
const EVALUATION_OPTIONS = [
  'Layak digunakan',
  'Tidak layak digunakan',
  'Penggunaan faktor koreksi',
];

function normalizeEvaluationResult(value) {
  const text = String(value ?? '').trim();
  return EVALUATION_OPTIONS.includes(text) ? text : '';
}

async function createSession(body, createdBy) {
  const sessionId = await repo.createSession({
    ...body,
    evaluation_result: normalizeEvaluationResult(body.evaluation_result) || null,
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
    evaluation_result:
      body.evaluation_result !== undefined
        ? normalizeEvaluationResult(body.evaluation_result) || null
        : existing.evaluation_result || null,
    updated_by: updatedBy || null,
  });
  return { updated: ok };
}

function normalizePoints(points = []) {
  return points.map((point, index) => ({
    point_no: Number(point.point_no) || index + 1,
    nominal_value: toNumberOrNull(point.nominal_value) ?? 0,
    correction_standard: toNumberOrNull(point.correction_standard) ?? 0,
    correction_media: toNumberOrNull(point.correction_media) ?? 0,
    correction_uut: toNumberOrNull(point.correction_uut) ?? 0,
    uc_1: toNumberOrNull(point.uc_1) ?? 0,
    uc_2: toNumberOrNull(point.uc_2) ?? 0,
    uc_3: toNumberOrNull(point.uc_3) ?? 0,
    digital_resolution: toNumberOrNull(point.digital_resolution) ?? 0,
    analog_resolution: toNumberOrNull(point.analog_resolution) ?? 0,
    readings: (point.readings || []).map((row, rIndex) => ({
      point_no: Number(point.point_no) || index + 1,
      sequence_no: Number(row.sequence_no) || rIndex + 1,
      standard_value: toNumberOrNull(row.standard_value) ?? 0,
      uut_value: toNumberOrNull(row.uut_value) ?? 0,
    })),
  })).filter((point) => point.readings.length);
}

async function saveWorkbook(sessionId, payload = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    await repo.deleteWorkbookBySession(sessionId, transaction);
    const points = normalizePoints(payload.points || []);
    for (const point of points) {
      await repo.insertPoint(sessionId, point, transaction);
      for (const row of point.readings) await repo.insertReading(sessionId, row, transaction);
    }
    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return { points: points.length, readings: points.reduce((sum, point) => sum + point.readings.length, 0) };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

function groupReadings(points, readings) {
  return points.map((point) => ({
    ...point,
    readings: readings.filter((row) => Number(row.point_no) === Number(point.point_no)),
  }));
}

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    const points = await repo.listPoints(sessionId, transaction);
    const readings = await repo.listReadings(sessionId, transaction);
    if (!points.length || !readings.length) {
      throw httpError('No temperature workbook readings found.', 422, [{ field: 'points', message: 'Isi data pembacaan temperature terlebih dahulu.' }]);
    }

    await repo.deleteResultsBySession(sessionId, transaction);
    const computed = formula.computeWorkbook({
      tolerance: toNumberOrNull(session.tolerance_accuracy),
      points: groupReadings(points, readings),
    });

    for (const point of computed.points) {
      await repo.insertResult({
        session_id: sessionId,
        point_no: point.point_no,
        nominal_value: point.nominal_value,
        mean_standard: point.mean_standard,
        mean_uut: point.mean_uut,
        mean_error: point.mean_error,
        sd_value: point.sd,
        u_combined: point.u_combined,
        u_expanded: point.u_expanded,
        tolerance: point.tolerance,
        pass_flag: point.pass,
      }, transaction);
    }
    await repo.upsertSummary(sessionId, computed, transaction);
    await repo.updateSessionConclusion(sessionId, computed.conclusion, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'temperature_calculate',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ results: computed.points.length, conclusion: computed.conclusion }),
      changed_by: changedBy,
    }, transaction).catch(() => {});

    await transaction.commit();
    return { sessionId, ...computed, results: computed.points };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

async function getSessionBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const [points, readings, results, summary, standards] = await Promise.all([
    repo.listPoints(sessionId),
    repo.listReadings(sessionId),
    repo.getResults(sessionId),
    repo.getSummary(sessionId),
    repo.listTemperatureStandards().catch(() => []),
  ]);
  return { session, workbook: { points, readings }, results, summary, standards };
}

async function getResults(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  return { sessionId, results: await repo.getResults(sessionId), summary: await repo.getSummary(sessionId) };
}

async function finalize(sessionId, changedBy = null) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  if (String(session.status).toUpperCase() !== 'CALCULATED') {
    throw httpError('Session must be CALCULATED before finalize.', 422);
  }
  await repo.updateSessionStatus(sessionId, 'FINALIZED', changedBy);
  return { sessionId, status: 'FINALIZED' };
}

async function listDaCandidates(filters) {
  return repo.listTemperatureDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTemperatureDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) throw httpError(`QA_ID ${explicitQaId} not found in DA Bagian.`, 404);
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTemperatureDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listTemperatureDaCandidates({ instrument_code: instrumentCode }, transaction);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) throw httpError('Multiple DA candidates found. Please choose qa_id explicitly.', 422);
  }
  throw httpError('Cannot resolve QA_ID. Provide qa_id explicitly in publish request.', 422);
}

function buildSuhuKelembabanText(session, explicit) {
  if (explicit) return String(explicit);
  const t = toNumberOrNull(session.temperature);
  const h = toNumberOrNull(session.humidity);
  if (t === null && h === null) return '';
  return `${t ?? '-'} deg C / ${h ?? '-'} %RH`;
}

async function publishToSertifikat(sessionId, changedBy = null, delegatedTo = null, options = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'FINALIZED', 'PUBLISHED'].includes(status)) {
      throw httpError('Session must be CALCULATED before publish.', 422);
    }
    const results = await repo.getResults(sessionId, transaction);
    if (!results.length) throw httpError('No temperature calculation results. Run calculate first.', 422);

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
    let idNoSertifikat = String(options.id_no_sertifikat || options.idNoSertifikat || session.id_no_sertifikat || '').trim();
    if (!idNoSertifikat) {
      const certCode = getCertificateTypeCode(qaCandidate.Parameter_Sertifikasi) || 'T';
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) throw httpError('Failed to generate certificate number.', 500);
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromTemperatureDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
      if (!inserted) throw httpError(`Failed to create sertifikat draft from DA for QA_ID ${qaId}.`, 422);
      createdDraft = true;
      header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    }
    if (!header) throw httpError(`Sertifikat header not found for QA_ID ${qaId} / ${idNoSertifikat}.`, 404);

    const finalInterval = toPositiveIntegerOrNull(options.interval)
      || toPositiveIntegerOrNull(session.interval_bulan)
      || toPositiveIntegerOrNull(header.Interval)
      || 12;
    const finalTglKalibrasi = toDateOrNull(options.tgl_kalibrasi) || toDateOrNull(session.calibration_date) || new Date();

    await repo.updateSertifikatBagianHeader({
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
      metode_kalibrasi: options.metode_kalibrasi ?? session.metode_kalibrasi ?? 'Kalibrasi Temperature - Workbook',
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    }, transaction);

    const publishRows = results.map((row, index) => ({
      seq_id: index + 1,
      pembacaan_alat: toNumberOrNull(row.mean_uut) ?? 0,
      pembacaan_standar: toNumberOrNull(row.mean_standard) ?? 0,
      error: (toNumberOrNull(row.mean_uut) ?? 0) - (toNumberOrNull(row.mean_standard) ?? 0),
      ketidakpastian: toNumberOrNull(row.u_expanded) ?? 0,
    }));

    await repo.replaceSertifikatBagianHasilKalRows(qaId, idNoSertifikat, publishRows, actor, delegatedActor, transaction);
    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'temperature_publish_sertifikat',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ qa_id: qaId, id_no_sertifikat: idNoSertifikat, rows: publishRows.length }),
      changed_by: actor,
    }, transaction).catch(() => {});

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

