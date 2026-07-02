'use strict';

const sql = require('mssql');
const repo = require('../../repositories/calibration-workbook.repository');
const formulaSvc = require('../../src/services/calibrationFormula.service');
const calcSvc = require('../../src/services/calibrationCalculation.service');

function parseIntParam(value, label) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    const err = new Error(`${label} must be integer.`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function buildValidationError(errors) {
  const err = new Error('Validation failed');
  err.statusCode = 422;
  err.validation = errors;
  return err;
}

const WORKBOOK_CYCLES = new Set(['X1', 'X2', 'X3', 'X4', 'X5', 'X6']);
const WORKBOOK_INDICATOR_TYPES = new Set(['ANALOG', 'DIGITAL']);
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SQL_INT_MAX = 2147483647;

function formatFieldLabel(field = 'value') {
  const raw = String(field || 'value').split('.').pop();
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function throwValidation(field, message) {
  throw buildValidationError([{ field, message }]);
}

function expandScientificNotation(value) {
  const raw = String(value);
  if (!/[eE]/.test(raw)) return raw;

  const [mantissaPart, exponentPart] = raw.toLowerCase().split('e');
  const exponent = Number(exponentPart);
  if (!Number.isFinite(exponent)) return raw;

  let mantissa = mantissaPart;
  let sign = '';
  if (mantissa.startsWith('-') || mantissa.startsWith('+')) {
    sign = mantissa[0] === '-' ? '-' : '';
    mantissa = mantissa.slice(1);
  }

  const [intPartRaw, fracPartRaw = ''] = mantissa.split('.');
  const intPart = intPartRaw || '0';
  const digits = `${intPart}${fracPartRaw}`.replace(/^0+(?=\d)/, '') || '0';
  const decimalIndex = intPart.length + exponent;

  if (decimalIndex <= 0) {
    return `${sign}0.${'0'.repeat(Math.abs(decimalIndex))}${digits}`;
  }
  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

function getDecimalParts(value) {
  const normalized = expandScientificNotation(value).trim();
  const unsigned = normalized.replace(/^[+-]/, '');
  const [intPartRaw = '0', fracPartRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
  const fracPart = fracPartRaw.replace(/0+$/, '');

  return {
    integerDigits: intPart ? intPart.length : 0,
    fractionDigits: fracPart.length,
  };
}

function normalizeDateInput(value, { field = 'value', required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throwValidation(field, `${formatFieldLabel(field)} is required.`);
    }
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    if (required) {
      throwValidation(field, `${formatFieldLabel(field)} is required.`);
    }
    return null;
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throwValidation(field, `${formatFieldLabel(field)} must be a valid date.`);
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeLimitedString(
  value,
  { field = 'value', maxLength = null, required = false } = {}
) {
  const normalized = normalizeString(value);
  if (!normalized) {
    if (required) {
      throwValidation(field, `${formatFieldLabel(field)} is required.`);
    }
    return null;
  }

  if (maxLength && normalized.length > maxLength) {
    throwValidation(
      field,
      `${formatFieldLabel(field)} cannot exceed ${maxLength} characters.`
    );
  }

  return normalized;
}

function normalizeNumber(value, { required = false, field = 'value' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throwValidation(field, `${formatFieldLabel(field)} is required.`);
    }
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throwValidation(field, `${formatFieldLabel(field)} must be a valid number.`);
  }
  return numeric;
}

function normalizeDecimal(
  value,
  {
    required = false,
    field = 'value',
    precision = null,
    scale = null,
    min = null,
    max = null,
  } = {}
) {
  const numeric = normalizeNumber(value, { required, field });
  if (numeric === null) return null;

  if (precision !== null || scale !== null) {
    const { integerDigits, fractionDigits } = getDecimalParts(value);
    const maxIntegerDigits =
      precision !== null && scale !== null ? precision - scale : null;

    if (scale !== null && fractionDigits > scale) {
      throwValidation(
        field,
        `${formatFieldLabel(field)} cannot have more than ${scale} decimal places.`
      );
    }

    if (maxIntegerDigits !== null && integerDigits > maxIntegerDigits) {
      throwValidation(
        field,
        `${formatFieldLabel(field)} cannot exceed ${maxIntegerDigits} digits before the decimal point.`
      );
    }
  }

  if (min !== null && numeric < min) {
    throwValidation(field, `${formatFieldLabel(field)} must be at least ${min}.`);
  }
  if (max !== null && numeric > max) {
    throwValidation(field, `${formatFieldLabel(field)} must be at most ${max}.`);
  }

  return numeric;
}

function normalizeInteger(
  value,
  { required = false, field = 'value', min = null, max = SQL_INT_MAX } = {}
) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throwValidation(field, `${formatFieldLabel(field)} is required.`);
    }
    return null;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    throwValidation(field, `${formatFieldLabel(field)} must be a whole number.`);
  }
  if (min !== null && numeric < min) {
    throwValidation(field, `${formatFieldLabel(field)} must be at least ${min}.`);
  }
  if (max !== null && numeric > max) {
    throwValidation(field, `${formatFieldLabel(field)} is too large.`);
  }
  return numeric;
}

function normalizeUnitMode(value) {
  const unit = String(value || '').trim().toUpperCase();
  if (!['PA', 'BAR'].includes(unit)) {
    throwValidation('unit_mode', 'Unit mode must be PA or BAR.');
  }
  return unit;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  const allowed = ['DRAFT', 'CALCULATED', 'FINALIZED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    throwValidation('status', `Status must be one of ${allowed.join(', ')}.`);
  }
  return status;
}

const EVALUATION_OPTIONS = new Set([
  'Layak digunakan',
  'Tidak layak digunakan',
  'Penggunaan faktor koreksi',
]);

function normalizeEvaluationResult(value) {
  const text = normalizeString(value);
  if (!text) return null;
  if (!EVALUATION_OPTIONS.has(text)) {
    throwValidation('evaluation_result', 'Evaluation result must be one of the allowed verdicts.');
  }
  return text;
}

function normalizeDirection(direction, cycleCode) {
  const normalized = formulaSvc.normalizeDirection(direction, cycleCode);
  if (!normalized) {
    throwValidation('direction', 'Direction must be INCREASING or DECREASING.');
  }
  return normalized;
}

function normalizeCycleCode(value) {
  const cycleCode = String(value || '').trim().toUpperCase();
  if (!WORKBOOK_CYCLES.has(cycleCode)) {
    throwValidation('cycle_code', 'Cycle code must be one of X1, X2, X3, X4, X5, or X6.');
  }
  return cycleCode;
}

function normalizeIndicatorType(value) {
  const indicatorType = normalizeLimitedString(value, {
    field: 'indicator_type',
    maxLength: 20,
  })?.toUpperCase();

  if (!indicatorType) return null;
  if (!WORKBOOK_INDICATOR_TYPES.has(indicatorType)) {
    throwValidation('indicator_type', 'Indicator type must be ANALOG or DIGITAL.');
  }
  return indicatorType;
}

function normalizeSourceType(value) {
  return normalizeLimitedString(value ?? 'MANUAL', {
    field: 'source_type',
    maxLength: 30,
    required: true,
  }).toUpperCase();
}

function getChangedBy(req) {
  return req?.user?.user_id || req?.user?.log_NIK || req?.body?.changedBy || null;
}

function sendError(res, error) {
  // Always log full error details for debugging.
  console.error('[calibration-workbook ERROR]', error);
  if (error.stack) {
    console.error('[calibration-workbook STACK]', error.stack);
  }

  if (error.statusCode && error.validation) {
    return res.status(error.statusCode).json({
      success: false,
      message: 'Validation failed',
      errors: error.validation,
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}

async function writeAuditSafe(payload) {
  try {
    await repo.insertAuditLog(payload);
  } catch (_) {
    // Intentionally ignore audit persistence failure for non-transactional CRUD responses.
  }
}

async function ensureSessionExists(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error('Session not found.');
    err.statusCode = 404;
    throw err;
  }
  return session;
}

async function ensurePointBelongsToSession(pointId, sessionId) {
  const point = await repo.getPointById(pointId);
  if (!point || Number(point.session_id) !== Number(sessionId)) {
    throwValidation(
      'point_id',
      `Point ${pointId} does not belong to session ${sessionId}.`
    );
  }
  return point;
}

function validateNoDuplicateReadingKeys(rows = []) {
  const seen = new Map();
  const errors = [];

  rows.forEach((row, index) => {
    const key = `${row.point_id}|${row.cycle_code}`;
    if (seen.has(key)) {
      errors.push({
        field: 'readings',
        message:
          `Duplicate reading for point ${row.point_id} cycle ${row.cycle_code} at row ${index + 1}.`,
      });
      return;
    }
    seen.set(key, index);
  });

  if (errors.length) {
    throw buildValidationError(errors);
  }
}

function mapSessionPayload(body, isUpdate = false) {
  const payload = {
    session_code: normalizeLimitedString(body.session_code ?? body.sessionCode, {
      field: 'session_code',
      maxLength: 50,
    }),
    instrument_id: normalizeLimitedString(body.instrument_id ?? body.instrumentId, {
      field: 'instrument_id',
      maxLength: 50,
    }),
    instrument_code: normalizeLimitedString(body.instrument_code ?? body.instrumentCode, {
      field: 'instrument_code',
      maxLength: 100,
    }),
    instrument_name: normalizeLimitedString(body.instrument_name ?? body.instrumentName, {
      field: 'instrument_name',
      maxLength: 255,
    }),
    calibration_date: normalizeDateInput(body.calibration_date ?? body.calibrationDate, {
      field: 'calibration_date',
    }),
    unit_mode: normalizeUnitMode(body.unit_mode ?? body.unitMode),
    status: isUpdate
      ? normalizeStatus(body.status || 'DRAFT')
      : 'DRAFT',
    pic: normalizeLimitedString(body.pic, {
      field: 'pic',
      maxLength: 100,
    }),
    temperature: normalizeDecimal(body.temperature, {
      required: false,
      field: 'temperature',
      precision: 10,
      scale: 2,
    }),
    humidity: normalizeDecimal(body.humidity, {
      required: false,
      field: 'humidity',
      precision: 10,
      scale: 2,
    }),
    notes: normalizeLimitedString(body.notes, {
      field: 'notes',
      maxLength: 1000,
    }),
    created_by: normalizeLimitedString(body.created_by, {
      field: 'created_by',
      maxLength: 100,
    }),
    updated_by: normalizeLimitedString(body.updated_by, {
      field: 'updated_by',
      maxLength: 100,
    }),
  };

  return payload;
}

function mapPublishPayload(body = {}) {
  return {
    ...body,
    qa_id: normalizeLimitedString(body.qa_id ?? body.qaId, {
      field: 'qa_id',
      maxLength: 50,
    }),
    id_no_sertifikat: normalizeLimitedString(
      body.id_no_sertifikat ?? body.idNoSertifikat,
      {
        field: 'id_no_sertifikat',
        maxLength: 50,
      }
    ),
    assm_nama_instrumen: normalizeLimitedString(
      body.assm_nama_instrumen ?? body.instrument_name,
      {
        field: 'assm_nama_instrumen',
        maxLength: 1000,
      }
    ),
    assm_no_identitas_istrumen: normalizeLimitedString(body.assm_no_identitas_istrumen, {
      field: 'assm_no_identitas_istrumen',
      maxLength: 50,
    }),
    assm_no_identitas_kalibrasi: normalizeLimitedString(body.assm_no_identitas_kalibrasi, {
      field: 'assm_no_identitas_kalibrasi',
      maxLength: 50,
    }),
    assm_kapasitas: normalizeLimitedString(body.assm_kapasitas, {
      field: 'assm_kapasitas',
      maxLength: 50,
    }),
    assm_lokasi: normalizeLimitedString(body.assm_lokasi, {
      field: 'assm_lokasi',
      maxLength: 1000,
    }),
    nama: normalizeLimitedString(body.nama, {
      field: 'nama',
      maxLength: 2000,
    }),
    no_ident_no_batch: normalizeLimitedString(body.no_ident_no_batch, {
      field: 'no_ident_no_batch',
      maxLength: 50,
    }),
    no_sertifikat: normalizeLimitedString(body.no_sertifikat, {
      field: 'no_sertifikat',
      maxLength: 50,
    }),
    tertelusur_melalui: normalizeLimitedString(body.tertelusur_melalui, {
      field: 'tertelusur_melalui',
      maxLength: 50,
    }),
    jenis_kalibrasi: normalizeLimitedString(body.jenis_kalibrasi, {
      field: 'jenis_kalibrasi',
      maxLength: 1,
    }),
    group_da_dept: normalizeLimitedString(body.group_da_dept, {
      field: 'group_da_dept',
      maxLength: 50,
    }),
    parameter_kalibrasi: normalizeLimitedString(body.parameter_kalibrasi, {
      field: 'parameter_kalibrasi',
      maxLength: 50,
    }),
    rekalibrasi: normalizeLimitedString(body.rekalibrasi, {
      field: 'rekalibrasi',
      maxLength: 50,
    }),
    metode_kalibrasi: normalizeLimitedString(body.metode_kalibrasi, {
      field: 'metode_kalibrasi',
      maxLength: 50,
    }),
    suhu_kelembaban: normalizeLimitedString(body.suhu_kelembaban ?? body.suhuKelembaban, {
      field: 'suhu_kelembaban',
      maxLength: 50,
    }),
    catatan: normalizeLimitedString(body.catatan, {
      field: 'catatan',
      maxLength: 500,
    }),
    delegated_to: normalizeLimitedString(body.delegated_to, {
      field: 'delegated_to',
      maxLength: 50,
    }),
    interval:
      body.interval === undefined || body.interval === null || body.interval === ''
      ? (
        body.parameter_interval === undefined
        || body.parameter_interval === null
        || body.parameter_interval === ''
      )
        ? null
        : normalizeInteger(body.parameter_interval, {
          field: 'parameter_interval',
          min: 1,
        })
      : normalizeInteger(body.interval, {
          field: 'interval',
          min: 1,
        }),
    tgl_kalibrasi: normalizeDateInput(body.tgl_kalibrasi ?? body.tglKalibrasi, {
      field: 'tgl_kalibrasi',
    }),
  };
}

async function listCalibrationSessions(req, res) {
  try {
    const data = await repo.listSessions({
      status: normalizeString(req.query.status),
      unitMode: normalizeString(req.query.unitMode || req.query.unit_mode),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getCalibrationSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const session = await repo.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const [points, readings, regressionInputs, levelCorrection, uncertaintyInputs] =
      await Promise.all([
        repo.listPoints(sessionId, { includeInactive: true }),
        repo.listReadings(sessionId),
        repo.listRegressionInputs(sessionId),
        repo.getLevelCorrection(sessionId),
        repo.getUncertaintyInputs(sessionId),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        session,
        points,
        readings,
        regression_inputs: regressionInputs,
        level_correction: levelCorrection,
        uncertainty_inputs: uncertaintyInputs,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createCalibrationSession(req, res) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const payload = mapSessionPayload(req.body, false);
    payload.created_by = getChangedBy(req) || payload.created_by;
    await transaction.begin();

    const sessionId = await repo.createSession(payload, transaction);

    const defaultLevelValues = formulaSvc.calculateLevelCorrection({
      delta_h: 0.02,
      media_density: 1.2,
      gravity: 9.78,
      unit_mode: payload.unit_mode,
    });

    await repo.upsertLevelCorrection(
      sessionId,
      {
        delta_h: 0.02,
        media_density: 1.2,
        gravity: 9.78,
        correction_pascal: defaultLevelValues.correction_pascal,
        correction_session_unit: defaultLevelValues.correction_session_unit,
        session_unit: payload.unit_mode,
      },
      transaction
    );

    await repo.upsertUncertaintyInputs(
      sessionId,
      {
        standard_uncertainty: null,
        metal_rule_uncertainty: null,
        instrument_resolution: null,
        indicator_type: 'DIGITAL',
        analog_resolution_factor: 0.2,
        digital_resolution_factor: 0.5,
        standard_sensitivity_coefficient: null,
        metal_rule_sensitivity_coefficient: null,
      },
      transaction
    );

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'calibration_session',
        entity_id: sessionId,
        action_type: 'CREATE',
        old_value: null,
        new_value: JSON.stringify(payload),
        changed_by: payload.created_by,
      },
      transaction
    );

    await transaction.commit();
    return res.status(201).json({ success: true, data: { session_id: sessionId } });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // ignore rollback error
    }
    return sendError(res, error);
  }
}

async function updateCalibrationSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const session = await repo.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    if (String(session.status || '').toUpperCase() === 'FINALIZED') {
      return res.status(409).json({
        success: false,
        message: 'FINALIZED session cannot be edited.',
      });
    }

    const payload = mapSessionPayload(req.body, true);
    payload.updated_by = getChangedBy(req) || payload.updated_by;

    const existingInstrumentLocked = Boolean(
      normalizeString(session.instrument_id)
      || normalizeString(session.instrument_code)
      || normalizeString(session.instrument_name)
    );
    const isInstrumentChanged =
      normalizeString(session.instrument_id) !== normalizeString(payload.instrument_id)
      || normalizeString(session.instrument_code) !== normalizeString(payload.instrument_code)
      || normalizeString(session.instrument_name) !== normalizeString(payload.instrument_name);

    if (existingInstrumentLocked && isInstrumentChanged) {
      return res.status(409).json({
        success: false,
        message: 'Instrument selection is locked for this session. Create a new session to use a different instrument.',
      });
    }

    const updated = await repo.updateSession(sessionId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_session',
      entity_id: sessionId,
      action_type: 'UPDATE',
      old_value: JSON.stringify(session),
      new_value: JSON.stringify(payload),
      changed_by: payload.updated_by,
    });

    return res.status(200).json({ success: true, data: { session_id: sessionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteCalibrationSession(req, res) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const session = await repo.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }
    if (String(session.status || '').toUpperCase() === 'FINALIZED') {
      return res.status(409).json({
        success: false,
        message: 'FINALIZED session cannot be deleted.',
      });
    }

    await transaction.begin();
    const deleted = await repo.deleteSessionGraph(sessionId, transaction);
    await transaction.commit();

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    return res.status(200).json({ success: true, data: { session_id: sessionId } });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // ignore rollback error
    }
    return sendError(res, error);
  }
}

async function finalizeCalibrationSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const changedBy = getChangedBy(req);
    const data = await calcSvc.finalizeSession(sessionId, changedBy);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function approveSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calcSvc.approveSession(sessionId, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function rejectSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const { reason } = req.body || {};
    const data = await calcSvc.rejectSession(sessionId, req.user, reason);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function publishSertifikatBagian(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const changedBy = getChangedBy(req);
    const delegatedTo = req?.user?.delegated_to || req?.body?.delegated_to || changedBy;
    const publishOptions = mapPublishPayload(req.body || {});

    const data = await calcSvc.publishSessionToSertifikatBagian(
      sessionId,
      changedBy,
      delegatedTo,
      publishOptions
    );

    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function listNominalPoints(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await repo.listPoints(sessionId, { includeInactive: false });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createNominalPoint(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    await ensureSessionExists(sessionId);
    const payload = {
      point_order: normalizeInteger(req.body.point_order ?? req.body.pointOrder, {
        required: true,
        field: 'point_order',
        min: 1,
      }),
      nominal_value: normalizeDecimal(req.body.nominal_value ?? req.body.nominalValue, {
        required: true,
        field: 'nominal_value',
        precision: 18,
        scale: 10,
      }),
      unit: normalizeUnitMode(req.body.unit || 'PA'),
      is_active: req.body.is_active === undefined ? true : Boolean(req.body.is_active),
    };

    const pointId = await repo.createPoint(sessionId, payload);
    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_nominal_points',
      entity_id: pointId,
      action_type: 'CREATE',
      old_value: null,
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(201).json({ success: true, data: { point_id: pointId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateNominalPoint(req, res) {
  try {
    const pointId = parseIntParam(req.params.pointId, 'pointId');
    const current = await repo.getPointById(pointId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Point not found.' });
    }

    const payload = {
      point_order: normalizeInteger(req.body.point_order ?? req.body.pointOrder, {
        required: true,
        field: 'point_order',
        min: 1,
      }),
      nominal_value: normalizeDecimal(req.body.nominal_value ?? req.body.nominalValue, {
        required: true,
        field: 'nominal_value',
        precision: 18,
        scale: 10,
      }),
      unit: normalizeUnitMode(req.body.unit || current.unit || 'PA'),
      is_active: req.body.is_active === undefined ? current.is_active : Boolean(req.body.is_active),
    };

    const updated = await repo.updatePoint(pointId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Point not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_nominal_points',
      entity_id: pointId,
      action_type: 'UPDATE',
      old_value: JSON.stringify(current),
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { point_id: pointId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteNominalPoint(req, res) {
  try {
    const pointId = parseIntParam(req.params.pointId, 'pointId');
    const current = await repo.getPointById(pointId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Point not found.' });
    }
    const updated = await repo.deactivatePoint(pointId);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Point not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_nominal_points',
      entity_id: pointId,
      action_type: 'DELETE',
      old_value: JSON.stringify(current),
      new_value: JSON.stringify({ is_active: false }),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { point_id: pointId } });
  } catch (error) {
    return sendError(res, error);
  }
}

function mapReadingPayload(body) {
  const cycleCode = normalizeCycleCode(body.cycle_code ?? body.cycleCode);
  return {
    point_id: normalizeInteger(body.point_id ?? body.pointId, {
      required: true,
      field: 'point_id',
      min: 1,
    }),
    cycle_code: cycleCode,
    direction: normalizeDirection(body.direction, cycleCode),
    uut_reading: normalizeDecimal(body.uut_reading ?? body.uutReading, {
      required: false,
      field: 'uut_reading',
      precision: 18,
      scale: 10,
    }),
    standard_reading: normalizeDecimal(body.standard_reading ?? body.standardReading, {
      required: false,
      field: 'standard_reading',
      precision: 18,
      scale: 10,
    }),
  };
}

async function listReadings(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await repo.listReadings(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createReading(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    await ensureSessionExists(sessionId);
    const payload = mapReadingPayload(req.body);
    await ensurePointBelongsToSession(payload.point_id, sessionId);
    const readingId = await repo.createReading(sessionId, payload);

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_readings',
      entity_id: readingId,
      action_type: 'CREATE',
      old_value: null,
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(201).json({ success: true, data: { reading_id: readingId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateReading(req, res) {
  try {
    const readingId = parseIntParam(req.params.readingId, 'readingId');
    const current = await repo.getReadingById(readingId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Reading not found.' });
    }
    const payload = mapReadingPayload(req.body);
    await ensurePointBelongsToSession(payload.point_id, current.session_id);
    const updated = await repo.updateReading(readingId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Reading not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_readings',
      entity_id: readingId,
      action_type: 'UPDATE',
      old_value: JSON.stringify(current),
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { reading_id: readingId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteReading(req, res) {
  try {
    const readingId = parseIntParam(req.params.readingId, 'readingId');
    const current = await repo.getReadingById(readingId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Reading not found.' });
    }

    const deleted = await repo.deleteReading(readingId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reading not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_readings',
      entity_id: readingId,
      action_type: 'DELETE',
      old_value: JSON.stringify(current),
      new_value: null,
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { reading_id: readingId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function bulkUpsertReadings(req, res) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    await ensureSessionExists(sessionId);
    if (!Array.isArray(req.body.readings)) {
      throwValidation('readings', 'Readings must be an array.');
    }

    const rows = req.body.readings.map((row) => ({
      reading_id:
        row.reading_id === undefined || row.reading_id === null || row.reading_id === ''
          ? null
          : normalizeInteger(row.reading_id, {
            field: 'reading_id',
            min: 1,
          }),
      ...mapReadingPayload(row),
    }));

    validateNoDuplicateReadingKeys(rows);
    for (const row of rows) {
      await ensurePointBelongsToSession(row.point_id, sessionId);
    }

    await transaction.begin();
    const result = await repo.bulkUpsertReadings(sessionId, rows, transaction);

    await repo.insertAuditLog(
      {
        session_id: sessionId,
        entity_name: 'calibration_readings',
        entity_id: null,
        action_type: 'UPDATE',
        old_value: null,
        new_value: JSON.stringify({ bulk_upsert: result, count: rows.length }),
        changed_by: getChangedBy(req),
      },
      transaction
    );

    await transaction.commit();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // ignore rollback error
    }
    console.log(error);
    return sendError(res, error);
  }
}

function mapRegressionPayload(body) {
  const direction = normalizeDirection(body.direction, null);
  return {
    point_id:
      body.point_id === null || body.point_id === undefined || body.point_id === ''
        ? null
        : normalizeInteger(body.point_id ?? body.pointId, {
          field: 'point_id',
          min: 1,
        }),
    direction,
    x_variable: normalizeDecimal(body.x_variable ?? body.xVariable, {
      required: true,
      field: 'x_variable',
      precision: 18,
      scale: 12,
    }),
    intercept: normalizeDecimal(body.intercept, {
      required: true,
      field: 'intercept',
      precision: 18,
      scale: 12,
    }),
    source_type: normalizeSourceType(body.source_type ?? body.sourceType),
  };
}

async function listRegressionInputs(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await repo.listRegressionInputs(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createRegressionInput(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    await ensureSessionExists(sessionId);
    const payload = mapRegressionPayload(req.body);
    if (payload.point_id !== null) {
      await ensurePointBelongsToSession(payload.point_id, sessionId);
    }
    const regressionId = await repo.createRegressionInput(sessionId, payload);

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_regression_inputs',
      entity_id: regressionId,
      action_type: 'CREATE',
      old_value: null,
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(201).json({ success: true, data: { regression_id: regressionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateRegressionInput(req, res) {
  try {
    const regressionId = parseIntParam(req.params.regressionId, 'regressionId');
    const current = await repo.getRegressionInputById(regressionId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Regression input not found.' });
    }

    const payload = mapRegressionPayload(req.body);
    if (payload.point_id !== null) {
      await ensurePointBelongsToSession(payload.point_id, current.session_id);
    }
    const updated = await repo.updateRegressionInput(regressionId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Regression input not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_regression_inputs',
      entity_id: regressionId,
      action_type: 'UPDATE',
      old_value: JSON.stringify(current),
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { regression_id: regressionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteRegressionInput(req, res) {
  try {
    const regressionId = parseIntParam(req.params.regressionId, 'regressionId');
    const current = await repo.getRegressionInputById(regressionId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Regression input not found.' });
    }

    const deleted = await repo.deleteRegressionInput(regressionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Regression input not found.' });
    }

    await writeAuditSafe({
      session_id: current.session_id,
      entity_name: 'calibration_regression_inputs',
      entity_id: regressionId,
      action_type: 'DELETE',
      old_value: JSON.stringify(current),
      new_value: null,
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: { regression_id: regressionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getLevelCorrection(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await repo.getLevelCorrection(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateLevelCorrection(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const session = await repo.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    const deltaH = normalizeDecimal(req.body.delta_h ?? req.body.deltaH, {
      required: true,
      field: 'delta_h',
      precision: 18,
      scale: 10,
    });
    const mediaDensity = normalizeDecimal(req.body.media_density ?? req.body.mediaDensity, {
      required: true,
      field: 'media_density',
      precision: 18,
      scale: 10,
    });
    const gravity = normalizeDecimal(req.body.gravity, {
      required: true,
      field: 'gravity',
      precision: 18,
      scale: 10,
    });

    const calculated = formulaSvc.calculateLevelCorrection({
      delta_h: deltaH,
      media_density: mediaDensity,
      gravity,
      unit_mode: session.unit_mode,
    });

    await repo.upsertLevelCorrection(sessionId, {
      delta_h: deltaH,
      media_density: mediaDensity,
      gravity,
      correction_pascal: calculated.correction_pascal,
      correction_session_unit: calculated.correction_session_unit,
      session_unit: session.unit_mode,
    });

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_level_corrections',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({
        delta_h: deltaH,
        media_density: mediaDensity,
        gravity,
        correction_pascal: calculated.correction_pascal,
        correction_session_unit: calculated.correction_session_unit,
      }),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({
      success: true,
      data: {
        delta_h: deltaH,
        media_density: mediaDensity,
        gravity,
        correction_pascal: calculated.correction_pascal,
        correction_session_unit: calculated.correction_session_unit,
        session_unit: session.unit_mode,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getUncertaintyInputs(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await repo.getUncertaintyInputs(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateUncertaintyInputs(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    await ensureSessionExists(sessionId);
    const payload = {
      standard_uncertainty: normalizeDecimal(req.body.standard_uncertainty ?? req.body.standardUncertainty, {
        required: false,
        field: 'standard_uncertainty',
        precision: 18,
        scale: 10,
      }),
      metal_rule_uncertainty: normalizeDecimal(req.body.metal_rule_uncertainty ?? req.body.metalRuleUncertainty, {
        required: false,
        field: 'metal_rule_uncertainty',
        precision: 18,
        scale: 10,
      }),
      instrument_resolution: normalizeDecimal(req.body.instrument_resolution ?? req.body.instrumentResolution, {
        required: false,
        field: 'instrument_resolution',
        precision: 18,
        scale: 10,
      }),
      indicator_type: normalizeIndicatorType(req.body.indicator_type ?? req.body.indicatorType),
      analog_resolution_factor: normalizeDecimal(req.body.analog_resolution_factor ?? req.body.analogResolutionFactor, {
        required: false,
        field: 'analog_resolution_factor',
        precision: 18,
        scale: 10,
      }) ?? 0.2,
      digital_resolution_factor: normalizeDecimal(req.body.digital_resolution_factor ?? req.body.digitalResolutionFactor, {
        required: false,
        field: 'digital_resolution_factor',
        precision: 18,
        scale: 10,
      }) ?? 0.5,
      standard_sensitivity_coefficient: normalizeDecimal(
        req.body.standard_sensitivity_coefficient ?? req.body.standardSensitivityCoefficient,
        {
          required: false,
          field: 'standard_sensitivity_coefficient',
          precision: 18,
          scale: 10,
        }
      ),
      metal_rule_sensitivity_coefficient: normalizeDecimal(
        req.body.metal_rule_sensitivity_coefficient ?? req.body.metalRuleSensitivityCoefficient,
        {
          required: false,
          field: 'metal_rule_sensitivity_coefficient',
          precision: 18,
          scale: 10,
        }
      ),
    };

    await repo.upsertUncertaintyInputs(sessionId, payload);

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_uncertainty_inputs',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify(payload),
      changed_by: getChangedBy(req),
    });

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return sendError(res, error);
  }
}

async function calculateSession(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const changedBy = getChangedBy(req);
    const data = await calcSvc.calculateSession(sessionId, changedBy);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getResults(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calcSvc.getSessionResultBundle(sessionId);
    return res.status(200).json({ success: true, data: data.results, certificate_rows: data.certificate_rows });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getSummary(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calcSvc.getSessionResultBundle(sessionId);
    return res.status(200).json({
      success: true,
      data: data.summary,
      uncertainty_components: data.uncertainty_components,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function listPressureConversions(req, res) {
  try {
    const data = await repo.listPressureConversions();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createPressureConversion(req, res) {
  try {
    const payload = {
      from_unit: normalizeLimitedString(req.body.from_unit ?? req.body.fromUnit, {
        field: 'from_unit',
        required: true,
        maxLength: 20,
      })?.toUpperCase(),
      to_unit: normalizeLimitedString(req.body.to_unit ?? req.body.toUnit, {
        field: 'to_unit',
        required: true,
        maxLength: 20,
      })?.toUpperCase(),
      factor: normalizeDecimal(req.body.factor, {
        required: true,
        field: 'factor',
        precision: 24,
        scale: 12,
      }),
    };

    const conversionId = await repo.createPressureConversion(payload);
    return res.status(201).json({ success: true, data: { conversion_id: conversionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updatePressureConversion(req, res) {
  try {
    const conversionId = parseIntParam(req.params.conversionId, 'conversionId');
    const payload = {
      from_unit: normalizeLimitedString(req.body.from_unit ?? req.body.fromUnit, {
        field: 'from_unit',
        required: true,
        maxLength: 20,
      })?.toUpperCase(),
      to_unit: normalizeLimitedString(req.body.to_unit ?? req.body.toUnit, {
        field: 'to_unit',
        required: true,
        maxLength: 20,
      })?.toUpperCase(),
      factor: normalizeDecimal(req.body.factor, {
        required: true,
        field: 'factor',
        precision: 24,
        scale: 12,
      }),
    };
    const updated = await repo.updatePressureConversion(conversionId, payload);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Conversion not found.' });
    }
    return res.status(200).json({ success: true, data: { conversion_id: conversionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function deletePressureConversion(req, res) {
  try {
    const conversionId = parseIntParam(req.params.conversionId, 'conversionId');
    const deleted = await repo.deletePressureConversion(conversionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Conversion not found.' });
    }
    return res.status(200).json({ success: true, data: { conversion_id: conversionId } });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateEvaluationResult(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const session = await ensureSessionExists(sessionId);

    if (String(session.status || '').toUpperCase() === 'FINALIZED') {
      return res.status(409).json({
        success: false,
        message: 'FINALIZED session cannot be edited.',
      });
    }

    const evaluationResult = normalizeEvaluationResult(
      req.body.evaluationResult ?? req.body.evaluation_result
    );
    const changedBy = getChangedBy(req);
    await repo.updateEvaluationResult(sessionId, evaluationResult, changedBy);

    await writeAuditSafe({
      session_id: sessionId,
      entity_name: 'calibration_session',
      entity_id: sessionId,
      action_type: 'UPDATE',
      old_value: JSON.stringify({ evaluation_result: session.evaluation_result || null }),
      new_value: JSON.stringify({ evaluation_result: evaluationResult }),
      changed_by: changedBy,
    });

    return res.status(200).json({
      success: true,
      data: { session_id: sessionId, evaluation_result: evaluationResult },
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  listCalibrationSessions,
  getCalibrationSession,
  createCalibrationSession,
  updateCalibrationSession,
  deleteCalibrationSession,
  finalizeCalibrationSession,
  approveSession,
  rejectSession,
  publishSertifikatBagian,
  updateEvaluationResult,
  listNominalPoints,
  createNominalPoint,
  updateNominalPoint,
  deleteNominalPoint,
  listReadings,
  createReading,
  updateReading,
  deleteReading,
  bulkUpsertReadings,
  listRegressionInputs,
  createRegressionInput,
  updateRegressionInput,
  deleteRegressionInput,
  getLevelCorrection,
  updateLevelCorrection,
  getUncertaintyInputs,
  updateUncertaintyInputs,
  calculateSession,
  getResults,
  getSummary,
  listPressureConversions,
  createPressureConversion,
  updatePressureConversion,
  deletePressureConversion,
};
