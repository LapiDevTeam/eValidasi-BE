'use strict';

const sql = require('mssql');
const repo = require('../../repositories/tapped-volumeter-calibration.repository');
const formula = require('./tappedVolumeterFormula.service');
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

async function createSession(body, createdBy) {
  const sessionId = await repo.createSession({
    ...body,
    status: 'DRAFT',
    created_by: createdBy || null,
  });
  return { sessionId };
}

async function updateSession(sessionId, body, updatedBy) {
  const existing = await repo.getSessionById(sessionId);
  if (!existing) throw httpError(`Session ${sessionId} not found.`, 404);
  const ok = await repo.updateSession(sessionId, { ...body, updated_by: updatedBy || null });
  return { updated: ok };
}

function normalizeSettings(settings = []) {
  return settings.map((setting, index) => ({
    setting_no: Number(setting.setting_no) || index + 1,
    setting_value: toNumberOrNull(setting.setting_value) ?? 0,
    error_std: toNumberOrNull(setting.error_std) ?? 0,
    readings: (setting.readings || []).map((row, rIndex) => ({
      setting_no: Number(setting.setting_no) || index + 1,
      sequence_no: Number(row.sequence_no) || rIndex + 1,
      jumlah_ketukan: toNumberOrNull(row.jumlah_ketukan) ?? 0,
      waktu: toNumberOrNull(row.waktu) ?? 0,
    })),
  })).filter((setting) => setting.readings.length);
}

async function saveWorkbook(sessionId, payload = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    await repo.deleteWorkbookBySession(sessionId, transaction);
    const settings = normalizeSettings(payload.settings || []);
    for (const setting of settings) {
      await repo.insertSetting(sessionId, setting, transaction);
      for (const row of setting.readings) await repo.insertReading(sessionId, row, transaction);
    }
    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return {
      settings: settings.length,
      readings: settings.reduce((sum, setting) => sum + setting.readings.length, 0),
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

function groupReadings(settings, readings) {
  return settings.map((setting) => ({
    ...setting,
    readings: readings.filter((row) => Number(row.setting_no) === Number(setting.setting_no)),
  }));
}

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    const settings = await repo.listSettings(sessionId, transaction);
    const readings = await repo.listReadings(sessionId, transaction);
    if (!settings.length || !readings.length) {
      throw httpError('No Tapped Volumeter workbook readings found.', 422, [
        { field: 'settings', message: 'Isi data pembacaan Tapped Volumeter terlebih dahulu.' },
      ]);
    }

    await repo.deleteResultsBySession(sessionId, transaction);
    const computed = formula.computeWorkbook({
      nominal_target: toNumberOrNull(session.nominal_target),
      lower_limit: toNumberOrNull(session.lower_limit),
      upper_limit: toNumberOrNull(session.upper_limit),
      settings: groupReadings(settings, readings),
    });

    for (const setting of computed.settings) {
      await repo.insertResult({
        session_id: sessionId,
        setting_no: setting.setting_no,
        setting_value: setting.setting_value,
        mean_jumlah_ketukan: setting.mean_jumlah_ketukan,
        mean_waktu: setting.mean_waktu,
        mean_waktu_plus_error: setting.mean_waktu_plus_error,
        mean_ketukan_per_menit: setting.mean_ketukan_per_menit,
        ms_tms: setting.ms_tms,
        pass_flag: setting.ms_tms === 'MS',
      }, transaction);
    }
    await repo.upsertSummary(sessionId, computed, transaction);
    await repo.updateSessionConclusion(sessionId, computed.conclusion, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'tapped_volumeter_calculate',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ results: computed.settings.length, conclusion: computed.conclusion }),
      changed_by: changedBy,
    }, transaction).catch(() => {});

    await transaction.commit();
    return { sessionId, ...computed, results: computed.settings };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

async function getSessionBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const [settings, readings, results, summary] = await Promise.all([
    repo.listSettings(sessionId),
    repo.listReadings(sessionId),
    repo.getResults(sessionId),
    repo.getSummary(sessionId),
  ]);
  return { session, workbook: { settings, readings }, results, summary };
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
  return repo.listTappedVolumeterDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTappedVolumeterDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) throw httpError(`QA_ID ${explicitQaId} not found in DA Bagian.`, 404);
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTappedVolumeterDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listTappedVolumeterDaCandidates({ instrument_code: instrumentCode }, transaction);
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
    if (!results.length) throw httpError('No Tapped Volumeter calculation results. Run calculate first.', 422);

    const qaCandidate = await resolveQaCandidate(session, options.qa_id || options.qaId, transaction);
    const qaId = String(qaCandidate.QA_ID);
    const actor = changedBy || 'SYSTEM';
    const delegatedActor = delegatedTo || actor;
    let idNoSertifikat = String(options.id_no_sertifikat || options.idNoSertifikat || session.id_no_sertifikat || '').trim();
    if (!idNoSertifikat) {
      const certCode = getCertificateTypeCode(qaCandidate.Parameter_Sertifikasi) || 'TV';
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) throw httpError('Failed to generate certificate number.', 500);
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromTappedVolumeterDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
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
      metode_kalibrasi: options.metode_kalibrasi ?? session.metode_kalibrasi ?? 'Kalibrasi Tapped Volumeter - Workbook',
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    }, transaction);

    // Pemetaan baris hasil kalibrasi -> T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal:
    //   pembacaan_alat   = rata-rata ketukan/menit (E_avg)
    //   pembacaan_standar = nominal target (250 ketukan/menit)
    //   error            = E_avg - nominal_target
    //   ketidakpastian   = 0  (workbook tidak menyediakan budget ketidakpastian)
    const nominalTarget = toNumberOrNull(session.nominal_target) ?? formula.DEFAULT_NOMINAL_TARGET;
    const publishRows = results.map((row, index) => {
      const meanKetukan = toNumberOrNull(row.mean_ketukan_per_menit) ?? 0;
      return {
        seq_id: index + 1,
        pembacaan_alat: meanKetukan,
        pembacaan_standar: nominalTarget,
        error: meanKetukan - nominalTarget,
        ketidakpastian: 0,
      };
    });

    await repo.replaceSertifikatBagianHasilKalRows(qaId, idNoSertifikat, publishRows, actor, delegatedActor, transaction);
    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'tapped_volumeter_publish_sertifikat',
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
