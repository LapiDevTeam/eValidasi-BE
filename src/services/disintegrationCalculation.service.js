'use strict';

const sql = require('mssql');
const repo = require('../../repositories/disintegration-calibration.repository');
const formula = require('./disintegrationFormula.service');
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

function clampPaddleCount(value) {
  const n = Number(value);
  if (!Number.isInteger(n)) return 1;
  return Math.min(3, Math.max(1, n));
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

// ---------------------------------------------------------------------------
// ROLE-BASED APPROVAL (Thermohygrometer-style)
// ---------------------------------------------------------------------------

const APPROVAL_ROLES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    column: 'approved_by_admin',
    dateColumn: 'approved_by_admin_date',
    rank: 1,
  },
  officer: {
    key: 'officer',
    label: 'Officer/Supervisor',
    column: 'approved_by_officer',
    dateColumn: 'approved_by_officer_date',
    rank: 2,
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    column: 'approved_by_manager',
    dateColumn: 'approved_by_manager_date',
    rank: 3,
  },
};

function getWorkbookApprovalRole(jobLevel) {
  const level = Number(jobLevel);
  if (Number.isNaN(level)) return null;
  if (level > 6) return APPROVAL_ROLES.admin;
  if (level === 5 || level === 6) return APPROVAL_ROLES.officer;
  if (level === 3) return APPROVAL_ROLES.manager;
  return null;
}

function getPendingRole(session) {
  if (!session?.approved_by_admin) return APPROVAL_ROLES.admin;
  if (!session?.approved_by_officer) return APPROVAL_ROLES.officer;
  if (!session?.approved_by_manager) return APPROVAL_ROLES.manager;
  return null;
}

function canApproveRole(userRole, pendingRole) {
  if (!userRole || !pendingRole) return false;
  return userRole.rank >= pendingRole.rank;
}

function assertApprovalOrder(session, role) {
  if (!role) return 'User tidak memiliki role approval workbook';

  const pending = getPendingRole(session);
  if (!pending) return 'Workbook sudah fully approved';

  if (!canApproveRole(role, pending)) {
    return `Role ${role.label} tidak bisa melakukan approval ${pending.label}`;
  }

  return '';
}

async function createSession(body, createdBy) {
  const sessionId = await repo.createSession({
    ...body,
    paddle_count: clampPaddleCount(body.paddle_count),
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
    paddle_count: clampPaddleCount(body.paddle_count || existing.paddle_count),
    evaluation_result:
      body.evaluation_result !== undefined
        ? normalizeEvaluationResult(body.evaluation_result) || null
        : existing.evaluation_result || null,
    updated_by: updatedBy || null,
  });
  return { updated: ok };
}

function normalizeTemperatureReadings(temperature = {}) {
  const rows = [];
  const standardPoints = temperature.standard_points || [];
  const uutPoints = temperature.uut_points || [];
  for (let pointNo = 1; pointNo <= 3; pointNo += 1) {
    for (let sequenceNo = 1; sequenceNo <= 3; sequenceNo += 1) {
      rows.push({
        point_no: pointNo,
        sequence_no: sequenceNo,
        standard_value: toNumberOrNull(standardPoints[pointNo - 1]?.[sequenceNo - 1]) ?? 0,
        uut_value: toNumberOrNull(uutPoints[pointNo - 1]?.[sequenceNo - 1]) ?? 0,
      });
    }
  }
  return rows;
}

async function saveWorkbook(sessionId, payload = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    await repo.deleteWorkbookBySession(sessionId, transaction);
    const counts = { temperature: 0, strokes: 0, distances: 0, timer: 0 };
    const temperature = payload.temperature || {};
    await repo.upsertTemperatureInputs(sessionId, {
      correction_readout: toNumberOrNull(temperature.correction_readout) ?? 0,
      correction_thermocouple: toNumberOrNull(temperature.correction_thermocouple) ?? 0,
      uc_readout: toNumberOrNull(temperature.uc_readout) ?? 0,
      uc_thermocouple: toNumberOrNull(temperature.uc_thermocouple) ?? 0,
      digital_resolution: toNumberOrNull(temperature.digital_resolution) ?? 0,
      analog_resolution: toNumberOrNull(temperature.analog_resolution) ?? 0,
    }, transaction);

    for (const row of normalizeTemperatureReadings(temperature)) {
      await repo.insertTemperatureReading(sessionId, row, transaction);
      counts.temperature += 1;
    }

    const paddles = Array.isArray(payload.paddles) ? payload.paddles : [];
    for (let i = 0; i < paddles.length; i += 1) {
      const paddleNo = paddles[i].paddle_no || i + 1;
      const strokes = Array.isArray(paddles[i].strokes) ? paddles[i].strokes : [];
      for (let r = 0; r < strokes.length; r += 1) {
        await repo.insertStrokeRow(sessionId, {
          paddle_no: paddleNo,
          sequence_no: strokes[r].sequence_no || r + 1,
          seconds_per_stroke: toNumberOrNull(strokes[r].seconds_per_stroke) ?? 0,
        }, transaction);
        counts.strokes += 1;
      }

      const distances = Array.isArray(paddles[i].distances) ? paddles[i].distances : [];
      for (let r = 0; r < distances.length; r += 1) {
        await repo.insertDistanceRow(sessionId, {
          paddle_no: paddleNo,
          sequence_no: distances[r].sequence_no || r + 1,
          distance_mm: toNumberOrNull(distances[r].distance_mm) ?? 0,
        }, transaction);
        counts.distances += 1;
      }

      const timer = paddles[i].timer || {};
      const timerRows = Array.isArray(timer.readings) ? timer.readings : [];
      for (let r = 0; r < timerRows.length; r += 1) {
        await repo.insertTimerReading(sessionId, {
          paddle_no: paddleNo,
          sequence_no: timerRows[r].sequence_no || r + 1,
          nominal_value: toNumberOrNull(timer.nominal_value) ?? 5,
          unit: timer.unit || 'Menit',
          std_jam: toNumberOrNull(timerRows[r].std_jam) ?? 0,
          std_menit: toNumberOrNull(timerRows[r].std_menit) ?? 0,
          std_detik: toNumberOrNull(timerRows[r].std_detik) ?? 0,
          std_mdetik: toNumberOrNull(timerRows[r].std_mdetik) ?? 0,
          uut_jam: toNumberOrNull(timerRows[r].uut_jam) ?? 0,
          uut_menit: toNumberOrNull(timerRows[r].uut_menit) ?? 0,
          uut_detik: toNumberOrNull(timerRows[r].uut_detik) ?? 0,
          uut_mdetik: toNumberOrNull(timerRows[r].uut_mdetik) ?? 0,
          correction_std: toNumberOrNull(timer.correction_std) ?? 0,
          uc_std: toNumberOrNull(timer.uc_std) ?? 0,
          digital_resolution: toNumberOrNull(timer.digital_resolution) ?? 0,
          analog_resolution: toNumberOrNull(timer.analog_resolution) ?? 0,
        }, transaction);
        counts.timer += 1;
      }
    }

    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return counts;
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

function groupBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  });
  return map;
}

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const tempInputs = await repo.listTemperatureInputs(sessionId, transaction);
    const tempRows = await repo.listTemperatureReadings(sessionId, transaction);
    const strokeRows = await repo.listStrokeRows(sessionId, transaction);
    const distanceRows = await repo.listDistanceRows(sessionId, transaction);
    const timerRows = await repo.listTimerReadings(sessionId, transaction);

    if (!timerRows.length) {
      throw httpError('No timer readings found.', 422, [{ field: 'timer', message: 'Isi data setting timer minimal satu paddle.' }]);
    }

    await repo.deleteResultsBySession(sessionId, transaction);

    const pointCount = clampPaddleCount(session.paddle_count);
    const standardPoints = [];
    const uutPoints = [];
    for (let pointNo = 1; pointNo <= pointCount; pointNo += 1) {
      const rows = tempRows.filter((row) => Number(row.point_no) === pointNo).sort((a, b) => a.sequence_no - b.sequence_no);
      standardPoints.push(rows.map((row) => row.standard_value));
      uutPoints.push(rows.map((row) => row.uut_value));
    }
    const tempComputed = formula.computeTemperature({
      point_count: pointCount,
      setting: toNumberOrNull(session.temperature_setting) ?? 37,
      standard_points: standardPoints,
      uut_points: uutPoints,
      correction_readout: tempInputs?.correction_readout,
      correction_thermocouple: tempInputs?.correction_thermocouple,
      uc_readout: tempInputs?.uc_readout,
      uc_thermocouple: tempInputs?.uc_thermocouple,
      digital_resolution: tempInputs?.digital_resolution,
      analog_resolution: tempInputs?.analog_resolution,
    });

    const resultRows = [];
    for (let i = 0; i < tempComputed.length; i += 1) {
      const c = tempComputed[i];
      const row = {
        session_id: sessionId,
        result_type: 'TEMPERATURE',
        point_no: i + 1,
        paddle_no: null,
        mean_standard: c.mean_standard,
        mean_uut: c.mean_uut,
        mean_error: c.mean_error,
        sd_value: c.sd,
        u_combined: c.u_combined,
        u_expanded: c.u_expanded,
        tolerance: toNumberOrNull(session.temperature_tolerance),
        pass_flag: null,
      };
      await repo.insertResult(row, transaction);
      resultRows.push(row);
    }

    const strokesByPaddle = groupBy(strokeRows, 'paddle_no');
    const distancesByPaddle = groupBy(distanceRows, 'paddle_no');
    const timerByPaddle = groupBy(timerRows, 'paddle_no');
    const timerResults = [];

    for (let paddleNo = 1; paddleNo <= pointCount; paddleNo += 1) {
      const stroke = formula.computeStrokeRate((strokesByPaddle.get(paddleNo) || []).sort((a, b) => a.sequence_no - b.sequence_no));
      const strokeRow = {
        session_id: sessionId,
        result_type: 'STROKE_RATE',
        point_no: null,
        paddle_no: paddleNo,
        mean_standard: stroke.avg_seconds_per_stroke,
        mean_uut: stroke.avg_strokes_per_minute,
        mean_error: null,
        sd_value: stroke.sd_strokes_per_minute,
        u_combined: null,
        u_expanded: null,
        pass_flag: null,
      };
      await repo.insertResult(strokeRow, transaction);
      resultRows.push(strokeRow);

      const distance = formula.computeDistance((distancesByPaddle.get(paddleNo) || []).sort((a, b) => a.sequence_no - b.sequence_no));
      const distanceRow = {
        session_id: sessionId,
        result_type: 'DISTANCE',
        point_no: null,
        paddle_no: paddleNo,
        mean_standard: distance.avg_distance_mm,
        mean_uut: null,
        mean_error: null,
        sd_value: null,
        u_combined: null,
        u_expanded: null,
        pass_flag: null,
      };
      await repo.insertResult(distanceRow, transaction);
      resultRows.push(distanceRow);

      const rows = (timerByPaddle.get(paddleNo) || []).sort((a, b) => a.sequence_no - b.sequence_no);
      const first = rows[0] || {};
      const timer = formula.computeTimerPoint({
        nominal_value: first.nominal_value,
        unit: first.unit,
        correction_std: first.correction_std,
        uc_std: first.uc_std,
        digital_resolution: first.digital_resolution,
        analog_resolution: first.analog_resolution,
        readings: rows,
      });
      const evalResult = formula.evaluateTimerPoint(
        timer.mean_error_sec,
        timer.u_expanded_sec,
        toNumberOrNull(session.timer_tolerance_sec)
      );
      const timerRow = {
        session_id: sessionId,
        result_type: 'TIMER',
        point_no: 1,
        paddle_no: paddleNo,
        mean_standard: timer.mean_standard_sec,
        mean_uut: timer.mean_uut_sec,
        mean_error: timer.mean_error_sec,
        sd_value: timer.sd_sec,
        u_combined: timer.u_combined,
        u_expanded: timer.u_expanded_sec,
        u_expanded_min: timer.u_expanded_menit,
        u_expanded_hour: timer.u_expanded_jam,
        tolerance: toNumberOrNull(session.timer_tolerance_sec),
        pass_flag: evalResult.pass,
      };
      await repo.insertResult(timerRow, transaction);
      resultRows.push(timerRow);
      timerResults.push(timerRow);
    }

    const conclusion = formula.deriveConclusion(timerResults);
    const maxTimerU = timerResults.reduce((max, row) => Math.max(max, Number(row.u_expanded || 0)), 0);

    await repo.upsertSummary(sessionId, {
      coverage_factor: formula.COVERAGE_FACTOR,
      max_timer_u_expanded_sec: maxTimerU,
      conclusion,
    }, transaction);
    await repo.updateSessionConclusion(sessionId, conclusion, transaction);
    // Reset approvals on recalculation so the workbook must be re-approved.
    await repo.resetSessionApprovals(sessionId, changedBy, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'disintegration_calculate',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ results: resultRows.length, conclusion }),
      changed_by: changedBy,
    }, transaction).catch(() => {});

    await transaction.commit();
    return { sessionId, conclusion, coverageFactor: formula.COVERAGE_FACTOR, maxTimerUExpandedSec: maxTimerU, results: resultRows };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

async function getSessionBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const [tempInputs, temperature, strokes, distances, timer, results, summary] = await Promise.all([
    repo.listTemperatureInputs(sessionId),
    repo.listTemperatureReadings(sessionId),
    repo.listStrokeRows(sessionId),
    repo.listDistanceRows(sessionId),
    repo.listTimerReadings(sessionId),
    repo.getResults(sessionId),
    repo.getSummary(sessionId),
  ]);
  return { session, workbook: { temperature_inputs: tempInputs, temperature, strokes, distances, timer }, results, summary };
}

async function getResults(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const results = await repo.getResults(sessionId);
  const summary = await repo.getSummary(sessionId);
  return { sessionId, results, summary };
}

// finalize is deprecated: approval is now role-based (Admin -> Officer -> Manager).
async function approveSession(sessionId, user) {
  const jobLevel = Number(
    user?.joblevel_id_user ?? user?.job_level_id ?? user?.Job_LevelID
  );
  const userId = user?.user_id || user?.log_NIK || '';
  const role = getWorkbookApprovalRole(jobLevel);

  if (!role) {
    throw httpError(`User tidak memiliki role approval workbook (job level terdeteksi: ${jobLevel || '-'}).`, 403);
  }

  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  const orderMessage = assertApprovalOrder(session, role);
  if (orderMessage) {
    throw httpError(orderMessage, 403);
  }

  const pendingRole = getPendingRole(session);
  await repo.updateSessionApproval(sessionId, { roleKey: pendingRole.key, userId });

  return {
    sessionId,
    approvedBy: pendingRole.key,
    approvedByLabel: pendingRole.label,
  };
}

async function rejectSession(sessionId, user, reason = '') {
  const userId = user?.user_id || user?.log_NIK || '';
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  await repo.clearSessionApprovals(sessionId, {
    rejectedBy: userId,
    rejectedReason: reason,
  });

  return {
    sessionId,
    rejectedBy: userId,
    rejectedReason: reason,
  };
}

// finalize is deprecated: approval is now role-based (Admin -> Officer -> Manager).
async function finalize(sessionId, changedBy = null) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  if (String(session.status).toUpperCase() !== 'CALCULATED') {
    throw httpError('Session must be CALCULATED before approval.', 422);
  }
  return { sessionId, status: session.status, note: 'Use role-based approve endpoint' };
}

async function listDaCandidates(filters) {
  return repo.listDisintegrationDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listDisintegrationDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) throw httpError(`QA_ID ${explicitQaId} not found in DA Bagian.`, 404);
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listDisintegrationDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listDisintegrationDaCandidates({ instrument_code: instrumentCode }, transaction);
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
  return `${t ?? '-'} °C / ${h ?? '-'} %RH`;
}

async function publishToSertifikat(sessionId, changedBy = null, delegatedTo = null, options = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'PUBLISHED'].includes(status)) {
      throw httpError(
        'Sertifikat belum bisa diterbitkan karena sesi ini belum dihitung. ' +
          'Jalankan "Hitung" sampai status menjadi CALCULATED, lalu terbitkan ulang.',
        422,
        [{ field: 'status', message: `Status sesi saat ini: ${status || 'TIDAK DIKETAHUI'}.` }]
      );
    }

    if (!session.approved_by_admin || !session.approved_by_officer || !session.approved_by_manager) {
      throw httpError(
        'Sertifikat belum bisa diterbitkan. Workbook harus di-approve oleh Admin, Officer/Supervisor, dan Manager.',
        403,
        [{ field: 'approval', message: 'Approval belum lengkap.' }]
      );
    }

    const results = await repo.getResults(sessionId, transaction);
    const timerResults = results.filter((row) => row.result_type === 'TIMER');
    if (!timerResults.length) throw httpError('No timer calculation results. Run calculate first.', 422);

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
      const certCode = getCertificateTypeCode(qaCandidate.Parameter_Sertifikasi) || 'DS';
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) throw httpError('Failed to generate certificate number.', 500);
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromDisintegrationDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
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
      metode_kalibrasi: options.metode_kalibrasi ?? session.metode_kalibrasi ?? 'Kalibrasi Disintegration Tester - Workbook',
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    }, transaction);

    const publishRows = timerResults
      .sort((a, b) => Number(a.paddle_no) - Number(b.paddle_no))
      .map((row, index) => ({
        seq_id: index + 1,
        pembacaan_alat: toNumberOrNull(row.mean_uut) ?? 0,
        pembacaan_standar: toNumberOrNull(row.mean_standard) ?? 0,
        error: toNumberOrNull(row.mean_error) ?? 0,
        ketidakpastian: toNumberOrNull(row.u_expanded) ?? 0,
      }));

    await repo.replaceSertifikatBagianHasilKalRows(qaId, idNoSertifikat, publishRows, actor, delegatedActor, transaction);
    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);
    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'disintegration_publish_sertifikat',
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
  approveSession,
  rejectSession,
  finalize,
  listDaCandidates,
  publishToSertifikat,
};
