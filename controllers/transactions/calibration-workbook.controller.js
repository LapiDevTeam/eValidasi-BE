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

function normalizeNumber(value, { required = false, field = 'value' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      const err = new Error(`${field} is required.`);
      err.statusCode = 400;
      throw err;
    }
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    const err = new Error(`${field} must be numeric.`);
    err.statusCode = 400;
    throw err;
  }
  return numeric;
}

function normalizeUnitMode(value) {
  const unit = String(value || '').trim().toUpperCase();
  if (!['PA', 'BAR'].includes(unit)) {
    const err = new Error('unit_mode must be PA or BAR.');
    err.statusCode = 400;
    throw err;
  }
  return unit;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  const allowed = ['DRAFT', 'CALCULATED', 'FINALIZED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    const err = new Error(`status must be one of ${allowed.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
  return status;
}

function normalizeDirection(direction, cycleCode) {
  const normalized = formulaSvc.normalizeDirection(direction, cycleCode);
  if (!normalized) {
    const err = new Error('direction must be INCREASING or DECREASING.');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function getChangedBy(req) {
  return req?.user?.user_id || req?.user?.log_NIK || req?.body?.changedBy || null;
}

function sendError(res, error) {
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

function mapSessionPayload(body, isUpdate = false) {
  const payload = {
    session_code: normalizeString(body.session_code ?? body.sessionCode),
    instrument_id: normalizeString(body.instrument_id ?? body.instrumentId),
    instrument_code: normalizeString(body.instrument_code ?? body.instrumentCode),
    instrument_name: normalizeString(body.instrument_name ?? body.instrumentName),
    calibration_date: normalizeString(body.calibration_date ?? body.calibrationDate),
    unit_mode: normalizeUnitMode(body.unit_mode ?? body.unitMode),
    status: isUpdate
      ? normalizeStatus(body.status || 'DRAFT')
      : 'DRAFT',
    pic: normalizeString(body.pic),
    temperature: normalizeNumber(body.temperature, { required: false, field: 'temperature' }),
    humidity: normalizeNumber(body.humidity, { required: false, field: 'humidity' }),
    notes: normalizeString(body.notes),
    created_by: normalizeString(body.created_by),
    updated_by: normalizeString(body.updated_by),
  };

  return payload;
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

async function publishSertifikatBagian(req, res) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const changedBy = getChangedBy(req);
    const delegatedTo = req?.user?.delegated_to || req?.body?.delegated_to || changedBy;
    const publishOptions = req.body || {};

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
    const payload = {
      point_order: parseIntParam(req.body.point_order ?? req.body.pointOrder, 'point_order'),
      nominal_value: normalizeNumber(req.body.nominal_value ?? req.body.nominalValue, {
        required: true,
        field: 'nominal_value',
      }),
      unit: normalizeString(req.body.unit) || 'PA',
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
      point_order: parseIntParam(req.body.point_order ?? req.body.pointOrder, 'point_order'),
      nominal_value: normalizeNumber(req.body.nominal_value ?? req.body.nominalValue, {
        required: true,
        field: 'nominal_value',
      }),
      unit: normalizeString(req.body.unit) || current.unit,
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
  const cycleCode = String((body.cycle_code ?? body.cycleCode) || '').toUpperCase();
  return {
    point_id: parseIntParam(body.point_id ?? body.pointId, 'point_id'),
    cycle_code: cycleCode,
    direction: normalizeDirection(body.direction, cycleCode),
    uut_reading: normalizeNumber(body.uut_reading ?? body.uutReading, {
      required: false,
      field: 'uut_reading',
    }),
    standard_reading: normalizeNumber(body.standard_reading ?? body.standardReading, {
      required: false,
      field: 'standard_reading',
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
    const payload = mapReadingPayload(req.body);
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
    if (!Array.isArray(req.body.readings)) {
      const err = new Error('readings must be an array.');
      err.statusCode = 400;
      throw err;
    }

    const rows = req.body.readings.map((row) => ({
      reading_id: row.reading_id ? parseIntParam(row.reading_id, 'reading_id') : null,
      ...mapReadingPayload(row),
    }));

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
        : parseIntParam(body.point_id ?? body.pointId, 'point_id'),
    direction,
    x_variable: normalizeNumber(body.x_variable ?? body.xVariable, {
      required: true,
      field: 'x_variable',
    }),
    intercept: normalizeNumber(body.intercept, {
      required: true,
      field: 'intercept',
    }),
    source_type: normalizeString((body.source_type ?? body.sourceType) || 'MANUAL')
      ?.toUpperCase(),
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
    const payload = mapRegressionPayload(req.body);
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

    const deltaH = normalizeNumber(req.body.delta_h ?? req.body.deltaH, {
      required: true,
      field: 'delta_h',
    });
    const mediaDensity = normalizeNumber(req.body.media_density ?? req.body.mediaDensity, {
      required: true,
      field: 'media_density',
    });
    const gravity = normalizeNumber(req.body.gravity, { required: true, field: 'gravity' });

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
    const payload = {
      standard_uncertainty: normalizeNumber(req.body.standard_uncertainty ?? req.body.standardUncertainty, {
        required: false,
        field: 'standard_uncertainty',
      }),
      metal_rule_uncertainty: normalizeNumber(req.body.metal_rule_uncertainty ?? req.body.metalRuleUncertainty, {
        required: false,
        field: 'metal_rule_uncertainty',
      }),
      instrument_resolution: normalizeNumber(req.body.instrument_resolution ?? req.body.instrumentResolution, {
        required: false,
        field: 'instrument_resolution',
      }),
      indicator_type: normalizeString(req.body.indicator_type ?? req.body.indicatorType)
        ?.toUpperCase() || null,
      analog_resolution_factor: normalizeNumber(req.body.analog_resolution_factor ?? req.body.analogResolutionFactor, {
        required: false,
        field: 'analog_resolution_factor',
      }) ?? 0.2,
      digital_resolution_factor: normalizeNumber(req.body.digital_resolution_factor ?? req.body.digitalResolutionFactor, {
        required: false,
        field: 'digital_resolution_factor',
      }) ?? 0.5,
      standard_sensitivity_coefficient: normalizeNumber(
        req.body.standard_sensitivity_coefficient ?? req.body.standardSensitivityCoefficient,
        { required: false, field: 'standard_sensitivity_coefficient' }
      ),
      metal_rule_sensitivity_coefficient: normalizeNumber(
        req.body.metal_rule_sensitivity_coefficient ?? req.body.metalRuleSensitivityCoefficient,
        { required: false, field: 'metal_rule_sensitivity_coefficient' }
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
      from_unit: normalizeString(req.body.from_unit ?? req.body.fromUnit)?.toUpperCase(),
      to_unit: normalizeString(req.body.to_unit ?? req.body.toUnit)?.toUpperCase(),
      factor: normalizeNumber(req.body.factor, { required: true, field: 'factor' }),
    };
    if (!payload.from_unit || !payload.to_unit) {
      const err = new Error('from_unit and to_unit are required.');
      err.statusCode = 400;
      throw err;
    }

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
      from_unit: normalizeString(req.body.from_unit ?? req.body.fromUnit)?.toUpperCase(),
      to_unit: normalizeString(req.body.to_unit ?? req.body.toUnit)?.toUpperCase(),
      factor: normalizeNumber(req.body.factor, { required: true, field: 'factor' }),
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

module.exports = {
  listCalibrationSessions,
  getCalibrationSession,
  createCalibrationSession,
  updateCalibrationSession,
  deleteCalibrationSession,
  finalizeCalibrationSession,
  publishSertifikatBagian,
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
