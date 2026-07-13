'use strict';

const sql = require('mssql');
const repo = require('../../repositories/calibration-workbook.repository');
const formulaSvc = require('./calibrationFormula.service');
const uncertaintySvc = require('./uncertaintyCalculation.service');
const {
  PROFILE_HASIL_TEMPLATE,
  resolveWorkbookProfile,
} = require('./workbookProfile.service');

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 422;
  err.validation = errors;
  return err;
}

const SQL_INT_MAX = 2147483647;
const PUBLISH_FIELD_LABELS = {
  qa_id: 'QA ID',
  id_no_sertifikat: 'Certificate number',
  jenis_kalibrasi: 'Calibration type',
  assm_nama_instrumen: 'Instrument name',
  assm_no_identitas_istrumen: 'Instrument ID',
  assm_no_identitas_kalibrasi: 'Calibration ID',
  assm_merk: 'Brand / Type',
  serial_number: 'Serial number',
  group_da_dept: 'Department',
  assm_kapasitas: 'Capacity / Resolution',
  parameter_kalibrasi: 'Calibration parameter',
  assm_lokasi: 'Location',
  nama: 'Standard name',
  no_ident_no_batch: 'Standard identity / batch number',
  no_sertifikat: 'Standard certificate number',
  tertelusur_melalui: 'Traceability reference',
  rekalibrasi: 'Recalibration note',
  metode_kalibrasi: 'Calibration method',
  suhu_kelembaban: 'Temperature / humidity note',
  catatan: 'Notes',
  user_id: 'User ID',
  delegated_to: 'Delegated to',
  approver_identity: 'Approver identity',
  interval: 'Interval',
};

function getPublishFieldLabel(field) {
  return PUBLISH_FIELD_LABELS[field] || field;
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

function getPendingApprovalRole(session) {
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

  const pending = getPendingApprovalRole(session);
  if (!pending) return 'Workbook sudah fully approved';

  if (!canApproveRole(role, pending)) {
    return `Role ${role.label} tidak bisa melakukan approval ${pending.label}`;
  }

  return '';
}

async function approveSession(sessionId, user) {
  const jobLevel = Number(
    user?.joblevel_id_user ?? user?.job_level_id ?? user?.Job_LevelID
  );
  const userId = user?.user_id || user?.log_NIK || '';
  const role = getWorkbookApprovalRole(jobLevel);

  if (!role) {
    const err = new Error(`User tidak memiliki role approval workbook (job level terdeteksi: ${jobLevel || '-'}).`);
    err.statusCode = 403;
    throw err;
  }

  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const orderMessage = assertApprovalOrder(session, role);
  if (orderMessage) {
    const err = new Error(orderMessage);
    err.statusCode = 403;
    throw err;
  }

  const pendingRole = getPendingApprovalRole(session);
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
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

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

function pushMaxLengthError(errors, field, value, maxLength) {
  if (value === undefined || value === null) return;
  const normalized = String(value).trim();
  if (!normalized) return;
  if (normalized.length > maxLength) {
    errors.push({
      field,
      message: `${getPublishFieldLabel(field)} cannot exceed ${maxLength} characters.`,
    });
  }
}

function pushPositiveIntegerError(errors, field, value) {
  if (value === undefined || value === null || value === '') return;
  if (!Number.isInteger(value) || value < 1 || value > SQL_INT_MAX) {
    errors.push({
      field,
      message: `${getPublishFieldLabel(field)} must be a whole number between 1 and ${SQL_INT_MAX}.`,
    });
  }
}

function validatePublishLengths({ daPayload, headerPayload, actor, delegatedActor, approverIdentity }) {
  const errors = [];

  const draftSafeLimits = {
    qa_id: 50,
    jenis_kalibrasi: 1,
    assm_nama_instrumen: 1000,
    assm_no_identitas_istrumen: 50,
    assm_no_identitas_kalibrasi: 50,
    assm_merk: 50,
    serial_number: 50,
    group_da_dept: 50,
    assm_kapasitas: 50,
    parameter_kalibrasi: 50,
    assm_lokasi: 1000,
    catatan: 500,
  };

  const headerLimits = {
    qa_id: 50,
    id_no_sertifikat: 50,
    assm_nama_instrumen: 1000,
    assm_no_identitas_kalibrasi: 50,
    assm_merk: 50,
    serial_number: 50,
    assm_kapasitas: 50,
    assm_lokasi: 1000,
    nama: 2000,
    no_ident_no_batch: 50,
    no_sertifikat: 50,
    tertelusur_melalui: 50,
    rekalibrasi: 50,
    metode_kalibrasi: 50,
    suhu_kelembaban: 50,
    catatan: 500,
    user_id: 50,
    delegated_to: 50,
  };

  Object.entries(draftSafeLimits).forEach(([field, maxLength]) => {
    pushMaxLengthError(errors, field, daPayload?.[field], maxLength);
  });
  Object.entries(headerLimits).forEach(([field, maxLength]) => {
    pushMaxLengthError(errors, field, headerPayload?.[field], maxLength);
  });

  pushMaxLengthError(errors, 'user_id', actor, 10);
  pushMaxLengthError(errors, 'delegated_to', delegatedActor, 10);
  pushMaxLengthError(errors, 'approver_identity', approverIdentity, 50);
  pushPositiveIntegerError(errors, 'interval', headerPayload?.interval);

  if (errors.length) {
    throw buildValidationError(errors);
  }
}

function getPointLabel(point) {
  const nominal = point?.nominal_value;
  const unit = point?.unit || '';
  return `${nominal} ${unit}`.trim();
}

function hasRegressionFor(regressions, pointId, direction) {
  const dir = String(direction || '').toUpperCase();
  if (!dir) return false;
  return regressions.some(
    (row) =>
      String(row.direction || '').toUpperCase() === dir
      && (Number(row.point_id) === Number(pointId) || row.point_id === null)
  );
}

function validateCalculationInputs({
  session,
  points,
  readings,
  regressionInputs,
  levelCorrection,
  uncertaintyInputs,
}) {
  const errors = [];

  if (!session) {
    errors.push({ field: 'session', message: 'Session must exist.' });
    return errors;
  }

  const status = String(session.status || '').toUpperCase();
  if (status === 'FINALIZED') {
    errors.push({
      field: 'status',
      message: 'Session already FINALIZED and cannot be recalculated.',
    });
  }

  if (!Array.isArray(points) || points.length === 0) {
    errors.push({ field: 'points', message: 'At least one nominal point is required.' });
  }

  if (!Array.isArray(readings) || readings.length === 0) {
    errors.push({ field: 'readings', message: 'At least one reading is required.' });
  }

  for (const point of points || []) {
    const pointReadings = (readings || []).filter(
      (item) => Number(item.point_id) === Number(point.point_id)
    );

    if (!pointReadings.length) {
      errors.push({
        field: 'readings',
        message: `Point ${getPointLabel(point)} has no readings.`,
      });
      continue;
    }

    const hasUut = pointReadings.some((item) => toNumberOrNull(item.uut_reading) !== null);
    const hasStd = pointReadings.some((item) => toNumberOrNull(item.standard_reading) !== null);

    if (!hasUut) {
      errors.push({
        field: 'readings',
        message: `Point ${getPointLabel(point)} has no UUT reading.`,
      });
    }
    if (!hasStd) {
      errors.push({
        field: 'readings',
        message: `Point ${getPointLabel(point)} has no standard reading.`,
      });
    }

    const directions = new Set(
      pointReadings
        .map((item) => formulaSvc.normalizeDirection(item.direction, item.cycle_code))
        .filter(Boolean)
    );
    directions.forEach((direction) => {
      if (!hasRegressionFor(regressionInputs || [], point.point_id, direction)) {
        errors.push({
          field: 'regressionInputs',
          message: `Missing regression for point ${getPointLabel(point)} direction ${direction}.`,
        });
      }
    });
  }

  if (!levelCorrection) {
    errors.push({
      field: 'levelCorrection',
      message: 'Level correction input must exist.',
    });
  } else {
    if (toNumberOrNull(levelCorrection.delta_h) === null) {
      errors.push({ field: 'levelCorrection', message: 'delta_h is required.' });
    }
    if (toNumberOrNull(levelCorrection.media_density) === null) {
      errors.push({ field: 'levelCorrection', message: 'media_density is required.' });
    }
    if (toNumberOrNull(levelCorrection.gravity) === null) {
      errors.push({ field: 'levelCorrection', message: 'gravity is required.' });
    }
  }

  if (!uncertaintyInputs) {
    errors.push({
      field: 'uncertaintyInputs',
      message: 'Uncertainty inputs must exist.',
    });
  }

  return errors;
}

async function getRegressionForReading(sessionId, pointId, direction, options = {}) {
  const directionUpper = String(direction || '').toUpperCase();
  const regressionInputs =
    options.regressionInputs
    || (await repo.listRegressionInputs(sessionId, options.transaction));

  const pointSpecific = regressionInputs.find(
    (item) =>
      Number(item.point_id) === Number(pointId)
      && String(item.direction || '').toUpperCase() === directionUpper
  );
  if (pointSpecific) return pointSpecific;

  const global = regressionInputs.find(
    (item) =>
      (item.point_id === null || item.point_id === undefined)
      && String(item.direction || '').toUpperCase() === directionUpper
  );
  if (global) return global;

  const err = new Error(
    `Regression for point ${pointId} direction ${directionUpper} is not configured.`
  );
  err.statusCode = 422;
  err.validation = [
    {
      field: 'regressionInputs',
      message: `Missing regression for point ${pointId} direction ${directionUpper}.`,
    },
  ];
  throw err;
}

async function calculateCorrectedReadings(sessionId, options = {}) {
  const readings = options.readings || (await repo.listReadings(sessionId, options.transaction));
  const regressionInputs =
    options.regressionInputs
    || (await repo.listRegressionInputs(sessionId, options.transaction));

  const correctedRows = [];

  for (const row of readings) {
    const direction = formulaSvc.normalizeDirection(row.direction, row.cycle_code);
    const rawStandardReading = toNumberOrNull(row.standard_reading);
    const uutReading = toNumberOrNull(row.uut_reading);
    let xVariable = null;
    let intercept = null;
    let correctedStandardReading = null;

    if (rawStandardReading !== null) {
      const regression = await getRegressionForReading(
        sessionId,
        row.point_id,
        direction,
        { regressionInputs, transaction: options.transaction }
      );
      xVariable = toNumberOrNull(regression.x_variable);
      intercept = toNumberOrNull(regression.intercept);
      correctedStandardReading = formulaSvc.correctStandardReading(
        rawStandardReading,
        xVariable,
        intercept
      );
    }

    correctedRows.push({
      session_id: sessionId,
      point_id: row.point_id,
      reading_id: row.reading_id,
      cycle_code: row.cycle_code,
      direction,
      uut_reading: uutReading,
      raw_standard_reading: rawStandardReading,
      corrected_standard_reading: correctedStandardReading,
      x_variable: xVariable,
      intercept,
    });
  }

  return correctedRows;
}

function buildCertificateRows(results, summary) {
  const expanded = summary?.expanded_uncertainty ?? null;
  return (results || []).map((row) => ({
    point_id: row.point_id,
    nominal_value: row.nominal_value,
    unit: row.unit,
    standard: row.mean_standard,
    uut: row.mean_uut,
    correction: row.final_error,
    error: row.mean_uut !== null && row.mean_standard !== null
      ? Number(row.mean_uut) - Number(row.mean_standard)
      : null,
    expanded_uncertainty: expanded,
  }));
}

function toPositiveIntegerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSuhuKelembabanText(session, explicitValue) {
  if (explicitValue !== undefined && explicitValue !== null && String(explicitValue).trim() !== '') {
    return String(explicitValue).trim();
  }

  const temp = toNumberOrNull(session?.temperature);
  const humidity = toNumberOrNull(session?.humidity);
  if (temp === null && humidity === null) return '';
  if (temp !== null && humidity !== null) return `Suhu ${temp} C; RH ${humidity} %`;
  if (temp !== null) return `Suhu ${temp} C`;
  return `RH ${humidity} %`;
}

async function resolveTekananQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTekananDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) {
      const err = new Error(`QA_ID ${explicitQaId} not found in DA Bagian Tekanan.`);
      err.statusCode = 404;
      throw err;
    }
    return matches[0];
  }

  // Prefer persisted QA reference from selected legacy instrument when available.
  const sessionQaId = String(session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTekananDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) {
      return matches[0];
    }
  }

  const instrumentCode = String(session?.instrument_code || '').trim();
  const instrumentName = String(session?.instrument_name || '').trim();

  if (!instrumentCode && !instrumentName) {
    const err = new Error('Cannot resolve QA_ID. Session instrument_code/instrument_name is empty.');
    err.statusCode = 422;
    err.validation = [
      {
        field: 'qa_id',
        message: 'Provide qa_id in publish request or save session with instrument from DA Bagian.',
      },
    ];
    throw err;
  }

  let candidates = [];
  if (instrumentCode) {
    candidates = await repo.listTekananDaCandidates({ instrument_code: instrumentCode }, transaction);
  }

  if (candidates.length !== 1 && instrumentName) {
    candidates = await repo.listTekananDaCandidates(
      { instrument_code: instrumentCode || undefined, instrument_name: instrumentName },
      transaction
    );
  }

  if (!candidates.length && instrumentName) {
    candidates = await repo.listTekananDaCandidates({ instrument_name: instrumentName }, transaction);
  }

  if (!candidates.length) {
    const err = new Error(
      'No Tekanan DA candidate found for this session. Provide qa_id explicitly in publish request.'
    );
    err.statusCode = 422;
    err.validation = [
      {
        field: 'qa_id',
        message: `No DA Bagian Tekanan match for instrument_code="${instrumentCode}" instrument_name="${instrumentName}".`,
      },
    ];
    throw err;
  }

  if (candidates.length > 1) {
    const err = new Error('Multiple DA Bagian Tekanan candidates found. Please choose qa_id explicitly.');
    err.statusCode = 422;
    err.validation = [
      {
        field: 'qa_id',
        message: `Multiple QA_ID candidates: ${candidates.map((item) => item.QA_ID).join(', ')}`,
      },
    ];
    throw err;
  }

  return candidates[0];
}

async function publishSessionToSertifikatBagian(
  sessionId,
  changedBy = null,
  delegatedTo = null,
  publishOptions = {}
) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) {
      const err = new Error(`Session ${sessionId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'FINALIZED', 'PUBLISHED'].includes(status)) {
      const err = new Error('Session must be CALCULATED before publish to sertifikat.');
      err.statusCode = 422;
      err.validation = [
        {
          field: 'status',
          message: `Current status is ${status || 'UNKNOWN'}.`,
        },
      ];
      throw err;
    }

    if (!session.approved_by_admin || !session.approved_by_officer || !session.approved_by_manager) {
      const err = new Error(
        'Sertifikat belum bisa diterbitkan. Workbook harus di-approve oleh Admin, Officer/Supervisor, dan Manager.'
      );
      err.statusCode = 403;
      err.validation = [{ field: 'approval', message: 'Approval belum lengkap.' }];
      throw err;
    }

    if (!session.evaluation_result) {
      const err = new Error(
        'Hasil evaluasi (kesimpulan) belum dipilih. Pilih kesimpulan sebelum menerbitkan sertifikat.'
      );
      err.statusCode = 422;
      err.validation = [
        { field: 'evaluation_result', message: 'Hasil evaluasi manual belum dipilih.' },
      ];
      throw err;
    }

    const results = await repo.getResults(sessionId, transaction);
    const summary = await repo.getSummary(sessionId, transaction);

    if (!results.length) {
      const err = new Error('No calculation results found for this session.');
      err.statusCode = 422;
      err.validation = [{ field: 'results', message: 'Run calculate before publish.' }];
      throw err;
    }
    if (!summary) {
      const err = new Error('No result summary found for this session.');
      err.statusCode = 422;
      err.validation = [{ field: 'summary', message: 'Run calculate before publish.' }];
      throw err;
    }

    const expandedUncertainty = toNumberOrNull(summary.expanded_uncertainty);
    if (expandedUncertainty === null) {
      const err = new Error('Expanded uncertainty is empty.');
      err.statusCode = 422;
      err.validation = [
        {
          field: 'summary.expanded_uncertainty',
          message: 'Expanded uncertainty is required before publish.',
        },
      ];
      throw err;
    }

    const qaCandidate = await resolveTekananQaCandidate(
      session,
      publishOptions.qa_id || publishOptions.qaId,
      transaction
    );
    const qaId = String(qaCandidate.QA_ID);

    const actor = changedBy || 'SYSTEM';
    const delegatedActor = delegatedTo || actor;

    const existingDa = await repo.getDaBagianByQaId(qaId, transaction);
    const requestedInterval = toPositiveIntegerOrNull(
      publishOptions.interval ?? publishOptions.parameter_interval
    );
    const existingDaInterval = toPositiveIntegerOrNull(existingDa?.Parameter_Interval);
    const qaCandidateInterval = toPositiveIntegerOrNull(qaCandidate?.Parameter_Interval);
    const finalInterval = requestedInterval || existingDaInterval || qaCandidateInterval || 12;

    const requestedTgl = toDateOrNull(
      publishOptions.tgl_kalibrasi || publishOptions.tglKalibrasi
    );
    const sessionCalDate = toDateOrNull(session.calibration_date);
    const existingDaTgl = toDateOrNull(existingDa?.Tgl_kalibrasi);
    const finalTglKalibrasi = requestedTgl || sessionCalDate || existingDaTgl || new Date();

    const daPayload = {
      qa_id: qaId,
      jenis_kalibrasi:
        publishOptions.jenis_kalibrasi
        ?? existingDa?.Jenis_kalibrasi
        ?? qaCandidate?.Jenis_kalibrasi
        ?? '1',
      parameter_sertifikasi: 'Tekanan',
      assm_nama_instrumen:
        publishOptions.assm_nama_instrumen
        ?? publishOptions.instrument_name
        ?? session.instrument_name
        ?? existingDa?.Assm_nama_instrumen
        ?? qaCandidate?.Assm_nama_instrumen
        ?? '',
      assm_no_identitas_istrumen:
        publishOptions.assm_no_identitas_istrumen
        ?? session.instrument_code
        ?? existingDa?.Assm_No_identitas_Istrumen
        ?? qaCandidate?.Assm_No_identitas_Istrumen
        ?? '',
      assm_no_identitas_kalibrasi:
        publishOptions.assm_no_identitas_kalibrasi
        ?? session.instrument_code
        ?? existingDa?.Assm_No_identitas_kalibrasi
        ?? qaCandidate?.Assm_No_identitas_kalibrasi
        ?? '',
      group_da_dept:
        publishOptions.group_da_dept
        ?? existingDa?.Group_Da_Dept
        ?? qaCandidate?.Group_Da_Dept
        ?? '',
      assm_kapasitas:
        publishOptions.assm_kapasitas
        ?? existingDa?.Assm_Kapasitas
        ?? qaCandidate?.Assm_Kapasitas
        ?? '',
      parameter_kalibrasi:
        publishOptions.parameter_kalibrasi
        ?? existingDa?.Parameter_Kalibrasi
        ?? qaCandidate?.Parameter_Kalibrasi
        ?? 'Pressure Calibration',
      assm_lokasi:
        publishOptions.assm_lokasi
        ?? existingDa?.Assm_Lokasi
        ?? qaCandidate?.Assm_Lokasi
        ?? '',
      tgl_kalibrasi: finalTglKalibrasi,
      parameter_interval_int: finalInterval,
      parameter_interval_text: String(finalInterval),
      catatan:
        publishOptions.catatan
        ?? session.notes
        ?? existingDa?.Catatan
        ?? qaCandidate?.Catatan
        ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    };

    const daApproverIdentity =
      (await repo.getApproverIdentity('KAL_DA_Bagian', 1, actor, transaction))
      || '0';

    validatePublishLengths({
      daPayload,
      actor,
      delegatedActor,
      approverIdentity: daApproverIdentity,
    });

    await repo.upsertDaBagian(daPayload, transaction);

    await repo.deleteDaBagianStatusByQaId(qaId, transaction);
    await repo.insertDaBagianStatus(
      {
        qa_id: qaId,
        approver_no: 1,
        is_reject: 0,
        approver_identity: daApproverIdentity,
        user_id: actor,
        delegated_to: delegatedActor,
      },
      transaction
    );

    let idNoSertifikat = String(
      publishOptions.id_no_sertifikat || publishOptions.idNoSertifikat || ''
    ).trim();
    let createdDraft = false;

    if (!idNoSertifikat) {
      const nextNo = await repo.getNextTekananCertificateNumber(transaction);
      if (!nextNo) {
        const err = new Error('Failed to generate pressure certificate number.');
        err.statusCode = 500;
        throw err;
      }
      idNoSertifikat = String(nextNo);
    }
    let header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    if (!header) {
      const inserted = await repo.createSertifikatBagianDraftFromDa(
        qaId,
        idNoSertifikat,
        actor,
        delegatedActor,
        transaction
      );
      if (!inserted) {
        const err = new Error(`Failed to create sertifikat draft from DA for QA_ID ${qaId}.`);
        err.statusCode = 422;
        err.validation = [
          {
            field: 'qa_id',
            message: `DA Bagian Tekanan record not found for QA_ID ${qaId}.`,
          },
        ];
        throw err;
      }
      createdDraft = true;
      header = await repo.getSertifikatBagianHeader(qaId, idNoSertifikat, transaction);
    }
    if (!header) {
      const err = new Error(
        `Sertifikat header not found for QA_ID ${qaId} and ID_No_Sertifikat ${idNoSertifikat}.`
      );
      err.statusCode = 404;
      throw err;
    }

    const updateHeaderPayload = {
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      assm_nama_instrumen:
        publishOptions.assm_nama_instrumen
        ?? publishOptions.instrument_name
        ?? session.instrument_name
        ?? header.Assm_nama_instrumen
        ?? '',
      assm_no_identitas_kalibrasi:
        publishOptions.assm_no_identitas_kalibrasi
        ?? header.Assm_No_identitas_kalibrasi
        ?? '',
      assm_kapasitas: publishOptions.assm_kapasitas ?? header.Assm_Kapasitas ?? '',
      assm_lokasi: publishOptions.assm_lokasi ?? header.Assm_Lokasi ?? '',
      nama: publishOptions.nama ?? header.Nama ?? '',
      no_ident_no_batch: publishOptions.no_ident_no_batch ?? header.No_Ident_No_batch ?? '',
      no_sertifikat: publishOptions.no_sertifikat ?? header.No_Sertifikat ?? '',
      tertelusur_melalui:
        publishOptions.tertelusur_melalui ?? header.Tertelusur_melalui ?? '',
      rekalibrasi: publishOptions.rekalibrasi ?? header.Rekalibrasi ?? '',
      tgl_kalibrasi: finalTglKalibrasi,
      interval: finalInterval,
      metode_kalibrasi:
        publishOptions.metode_kalibrasi
        ?? header.Metode_kalibrasi
        ?? 'Kalibrasi Tekanan - Workbook',
      suhu_kelembaban: buildSuhuKelembabanText(
        session,
        publishOptions.suhu_kelembaban ?? publishOptions.suhuKelembaban ?? header.Suhu_Kelembaban
      ),
      catatan: publishOptions.catatan ?? session.notes ?? header.Catatan ?? '',
      user_id: actor,
      delegated_to: delegatedActor,
    };

    validatePublishLengths({
      daPayload,
      headerPayload: updateHeaderPayload,
      actor,
      delegatedActor,
      approverIdentity: daApproverIdentity,
    });

    const updatedHeader = await repo.updateSertifikatBagianHeader(
      updateHeaderPayload,
      transaction
    );
    if (!updatedHeader) {
      const err = new Error('Failed to update sertifikat header.');
      err.statusCode = 500;
      throw err;
    }

    const sortedResults = [...results].sort(
      (a, b) => Number(a.point_order) - Number(b.point_order)
    );
    const publishRows = [];
    const rowErrors = [];

    sortedResults.forEach((row, index) => {
      const pembacaanAlat = toNumberOrNull(row.mean_uut);
      const pembacaanStandar = toNumberOrNull(row.mean_standard);
      const finalError = toNumberOrNull(row.final_error);

      if (pembacaanAlat === null || pembacaanStandar === null || finalError === null) {
        rowErrors.push({
          field: 'results',
          message:
            `Point ${row.nominal_value} ${row.unit}: mean_uut/mean_standard/final_error must be numeric.`,
        });
        return;
      }

      publishRows.push({
        seq_id: index + 1,
        pembacaan_alat: pembacaanAlat,
        pembacaan_standar: pembacaanStandar,
        error: finalError,
        ketidakpastian: expandedUncertainty,
      });
    });

    if (rowErrors.length) {
      throw buildValidationError(rowErrors);
    }

    await repo.replaceSertifikatBagianHasilKalRows(
      qaId,
      idNoSertifikat,
      publishRows,
      actor,
      delegatedActor,
      transaction
    );

    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'publish_sertifikat_bagian',
        entity_id: null,
        action_type: 'UPDATE',
        old_value: null,
        new_value: JSON.stringify({
          qa_id: qaId,
          id_no_sertifikat: idNoSertifikat,
          published_rows: publishRows.length,
          interval: finalInterval,
          tgl_kalibrasi: finalTglKalibrasi,
        }),
        changed_by: actor,
      },
      transaction
    );

    await transaction.commit();

    return {
      success: true,
      session_id: sessionId,
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      created_new_sertifikat: createdDraft,
      published_rows: publishRows.length,
      da_synced: true,
      da_status_approved: true,
      certificate_source: 'T_Kalibrasi_Sertifikat_Bagian',
      next: {
        approve_endpoint: '/transactions/kalibrasi/sertifikat-bagian/approve',
        print_data_endpoint: `/transactions/kalibrasi/sertifikat-bagian/print-data?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
      },
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // Ignore rollback failure to preserve original error.
    }
    throw error;
  }
}

async function calculateSession(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    const points = await repo.listPoints(sessionId, { includeInactive: false }, transaction);
    const readings = await repo.listReadings(sessionId, transaction);
    const regressionInputs = await repo.listRegressionInputs(sessionId, transaction);
    const levelCorrection = await repo.getLevelCorrection(sessionId, transaction);
    const uncertaintyInputs = await repo.getUncertaintyInputs(sessionId, transaction);

    const validationErrors = validateCalculationInputs({
      session,
      points,
      readings,
      regressionInputs,
      levelCorrection,
      uncertaintyInputs,
    });

    if (validationErrors.length) {
      throw buildValidationError(validationErrors);
    }

    const workbookProfile = resolveWorkbookProfile(session, points);
    const errorConvention =
      workbookProfile === PROFILE_HASIL_TEMPLATE
        ? formulaSvc.ERROR_CONVENTION_UUT_MINUS_STD
        : formulaSvc.ERROR_CONVENTION_STD_MINUS_UUT;

    const levelValues = formulaSvc.calculateLevelCorrection({
      delta_h: levelCorrection.delta_h,
      media_density: levelCorrection.media_density,
      gravity: levelCorrection.gravity,
      unit_mode: session.unit_mode,
    });
    const levelCorrectionForResult =
      workbookProfile === PROFILE_HASIL_TEMPLATE
        ? 0
        : levelValues.correction_session_unit;

    await repo.upsertLevelCorrection(
      sessionId,
      {
        delta_h: levelCorrection.delta_h,
        media_density: levelCorrection.media_density,
        gravity: levelCorrection.gravity,
        correction_pascal: levelValues.correction_pascal,
        correction_session_unit: levelValues.correction_session_unit,
        session_unit: session.unit_mode,
      },
      transaction
    );

    await repo.deleteDerivedBySession(sessionId, transaction);

    const correctedRows = await calculateCorrectedReadings(sessionId, {
      transaction,
      readings,
      regressionInputs,
    });
    await repo.insertCorrectedReadings(correctedRows, transaction);

    const pointMap = new Map();
    for (const row of correctedRows) {
      const key = Number(row.point_id);
      if (!pointMap.has(key)) pointMap.set(key, []);
      pointMap.get(key).push(row);
    }

    const sortedPoints = [...points].sort(
      (a, b) => Number(a.point_order) - Number(b.point_order)
    );
    const zeroPoint =
      sortedPoints.find((point) => Number(point.nominal_value) === 0) || sortedPoints[0];
    const zeroPointRows = zeroPoint ? pointMap.get(Number(zeroPoint.point_id)) || [] : [];

    const resultRows = sortedPoints.map((point) => {
      const perPointRows = pointMap.get(Number(point.point_id)) || [];
      const pointResult = formulaSvc.calculatePointResult({
        point,
        correctedReadings: perPointRows,
        levelCorrection: levelCorrectionForResult,
        zeroPointReadings: zeroPointRows,
        errorConvention,
      });

      return {
        session_id: sessionId,
        ...pointResult,
      };
    });

    await repo.insertResults(resultRows, transaction);

    const maxRepeatability = resultRows.reduce((maxValue, row) => {
      const repeatability = toNumberOrNull(row.repeatability);
      if (repeatability === null) return maxValue;
      return Math.max(maxValue, repeatability);
    }, 0);

    const zeroDeviationForBudget =
      formulaSvc.calculateZeroDeviationFromWorkbookLogic(zeroPointRows) ?? 0;

    const budget = uncertaintySvc.calculateUncertaintyBudget({
      session_id: sessionId,
      unit: session.unit_mode,
      zero_deviation: zeroDeviationForBudget,
      max_repeatability: maxRepeatability,
      uncertainty_inputs: uncertaintyInputs,
      workbook_profile: workbookProfile,
    });

    await repo.insertUncertaintyComponents(budget.components, transaction);
    await repo.upsertResultSummary(sessionId, budget.summary, transaction);

    // Recalculation invalidates any previous approvals.
    await repo.resetSessionApprovals(sessionId, changedBy, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'calibration_session',
        entity_id: sessionId,
        action_type: 'CALCULATE',
        old_value: null,
        new_value: JSON.stringify({
          workbook_profile: workbookProfile,
          error_convention: errorConvention,
          level_correction_used: levelCorrectionForResult,
          summary: budget.summary,
          max_repeatability: maxRepeatability,
          zero_deviation: zeroDeviationForBudget,
        }),
        changed_by: changedBy,
      },
      transaction
    );

    await transaction.commit();

    const results = await repo.getResults(sessionId);
    const summary = await repo.getSummary(sessionId);
    const components = await repo.getUncertaintyComponents(sessionId);
    const certificateRows = buildCertificateRows(results, summary);

    return {
      success: true,
      session_id: sessionId,
      status: 'CALCULATED',
      level_correction: {
        correction_pascal: levelValues.correction_pascal,
        correction_session_unit: levelCorrectionForResult,
        session_unit: session.unit_mode,
      },
      workbook_profile: workbookProfile,
      results,
      summary,
      uncertainty_components: components,
      certificate_rows: certificateRows,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // Ignore rollback failure to preserve original error.
    }
    throw error;
  }
}

async function getSessionResultBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const results = await repo.getResults(sessionId);
  const summary = await repo.getSummary(sessionId);
  const components = await repo.getUncertaintyComponents(sessionId);

  return {
    success: true,
    session,
    results,
    summary,
    uncertainty_components: components,
    certificate_rows: buildCertificateRows(results, summary),
  };
}

// finalize is deprecated: approval is now role-based (Admin -> Officer -> Manager).
async function finalizeSession(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  return {
    session_id: sessionId,
    status: session.status,
    note: 'Use role-based approve endpoint',
  };
}

module.exports = {
  getRegressionForReading,
  calculateCorrectedReadings,
  calculateSession,
  getSessionResultBundle,
  finalizeSession,
  publishSessionToSertifikatBagian,
  getWorkbookApprovalRole,
  getPendingApprovalRole,
  approveSession,
  rejectSession,
};
