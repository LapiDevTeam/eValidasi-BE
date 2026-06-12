'use strict';

/**
 * pressure-calibration.controller.js
 *
 * Handles HTTP layer for the pressure calibration module.
 * Delegates all business logic to calibration.service.js.
 * Delegates all MSSQL I/O to pressure-calibration.repository.js.
 */

const repo    = require('../../repositories/pressure-calibration.repository');
const calSvc  = require('../../services/pressure-calibration/calibration.service');
const ExcelJS = require('exceljs');

function createBadRequestError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function normalizeInstrumentWriteError(err) {
  if (err?.statusCode) return err;

  const message = String(err?.message || '');
  if (/String or binary data would be truncated/i.test(message)) {
    return createBadRequestError(
      'One or more fields are too long. Please shorten the input and try again.'
    );
  }

  return err;
}

function normalizeString(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeDate(value) {
  const str = normalizeString(value);
  if (!str) return null;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    throw createBadRequestError('recalibrationDate must be a valid date.');
  }
  return str;
}

function normalizeNumber(value, fieldName, { required = false, defaultValue = null } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw createBadRequestError(`${fieldName} is required.`);
    }
    return defaultValue;
  }

  const n = Number(value);
  if (Number.isNaN(n)) {
    throw createBadRequestError(`${fieldName} must be numeric.`);
  }
  return n;
}

function parseBooleanQuery(value, fieldName, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  throw createBadRequestError(`${fieldName} must be boolean.`);
}

function normalizeJenisKalibrasi(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  if (/^internal$/i.test(normalized)) return 'Internal';
  if (/^external$/i.test(normalized)) return 'External';

  throw createBadRequestError('jenisKalibrasi must be Internal or External.');
}

function resolveInstrumentType(req) {
  return normalizeString(req.params.instrumentType)
    || normalizeString(req.body?.instrument_type)
    || normalizeString(req.body?.instrumentType)
    || normalizeString(req.query.instrument_type)
    || normalizeString(req.query.instrumentType);
}

function resolveInstrumentSourceId(req) {
  return normalizeString(req.params.id)
    || normalizeString(req.body?.source_id)
    || normalizeString(req.body?.sourceId)
    || normalizeString(req.body?.qa_id)
    || normalizeString(req.body?.qaId)
    || normalizeString(req.query.source_id)
    || normalizeString(req.query.sourceId)
    || normalizeString(req.query.qa_id)
    || normalizeString(req.query.qaId);
}

function buildInstrumentMeta(req) {
  return {
    userId: req.user?.user_id || req.user?.UserID || normalizeString(req.body?.user_id) || normalizeString(req.body?.userId),
    delegatedTo: req.user?.delegated_to
      || req.user?.delegatedTo
      || normalizeString(req.body?.delegated_to)
      || normalizeString(req.body?.delegatedTo),
  };
}

function resolveIncludeWorkbookFormatted(req) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'includeWorkbookFormatted')) {
    return parseBooleanQuery(req.body.includeWorkbookFormatted, 'includeWorkbookFormatted', true);
  }

  return parseBooleanQuery(req.query.includeWorkbookFormatted, 'includeWorkbookFormatted', true);
}

function buildStandardPayload(body) {
  const standardName = normalizeString(body.standardName);
  if (!standardName) throw createBadRequestError('standardName is required.');

  return {
    standardCode:      normalizeString(body.standardCode),
    standardName,
    certificateNo:     normalizeString(body.certificateNo),
    traceability:      normalizeString(body.traceability),
    recalibrationDate: normalizeDate(body.recalibrationDate),
    unit:              normalizeString(body.unit),
  };
}

function buildPointPayload(row, index, fallbackUnit) {
  const actualPressure = normalizeNumber(row.actualPressure, `points[${index}].actualPressure`, {
    required: true,
  });
  const indicatorIncreasing = normalizeNumber(
    row.indicatorIncreasing,
    `points[${index}].indicatorIncreasing`,
    { required: true }
  );
  const indicatorDecreasing = normalizeNumber(
    row.indicatorDecreasing,
    `points[${index}].indicatorDecreasing`,
    { required: true }
  );
  const uncertainty = normalizeNumber(row.uncertainty, `points[${index}].uncertainty`, {
    required: false,
    defaultValue: 0,
  });

  return {
    actualPressure,
    indicatorIncreasing,
    indicatorDecreasing,
    uncertainty,
    unit: normalizeString(row.unit) || fallbackUnit || null,
  };
}

function buildPointsPayload(points, fallbackUnit) {
  if (!Array.isArray(points)) return undefined;

  const normalized = [];
  points.forEach((row, index) => {
    const current = row || {};

    const allEmpty = [
      current.actualPressure,
      current.indicatorIncreasing,
      current.indicatorDecreasing,
      current.uncertainty,
    ].every((v) => v === undefined || v === null || String(v).trim() === '');

    if (allEmpty) return;
    normalized.push(buildPointPayload(current, index, fallbackUnit));
  });

  return normalized;
}

// =============================================================================
// INSTRUMENTS  (read-only, unified across existing instrument sources)
// =============================================================================

/**
 * GET /api/pressure-calibration/instruments
 * Optional filters:
 *   ?search=<text>
 *   ?department=<text>
 *   ?parameter=<text>
 *   ?location=<text>
 *   ?jenisKalibrasi=Internal|External
 *   ?includeExternal=true|false (default: true)
 */
const listInstruments = async (req, res, next) => {
  try {
    const filters = {
      search:          normalizeString(req.query.search),
      department:      normalizeString(req.query.department),
      parameter:       normalizeString(req.query.parameter),
      location:        normalizeString(req.query.location),
      jenisKalibrasi:  normalizeJenisKalibrasi(req.query.jenisKalibrasi),
      includeExternal: parseBooleanQuery(req.query.includeExternal, 'includeExternal', true),
    };

    const data = await repo.listInstruments(filters);
    res.status(200).json(data);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /pressure-calibration/da-bagian-history?qa_id=QA-BA-000004
 */
const getDaBagianHistory = async (req, res, next) => {
  try {
    const qaId = normalizeString(req.query.qa_id)
      || normalizeString(req.query.qaId)
      || normalizeString(req.query.QA_ID);

    if (!qaId) throw createBadRequestError('qa_id is required.');

    const data = await repo.getDaBagianHistoryByQaId(qaId);
    res.status(200).json(data);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/instruments/:id
 * :id = QA_ID string, e.g. QA-TH-000001
 */
const getInstrument = async (req, res, next) => {
  try {
    const qaId = req.params.id;
    if (!qaId) return res.status(400).json({ message: 'Invalid instrument id.' });

    const data = await repo.getInstrumentById(qaId);
    if (!data) return res.status(404).json({ message: `Instrument ${qaId} not found.` });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /pressure-calibration/instruments/export
 * Same query filters as listInstruments. Returns an xlsx file.
 */
const exportInstruments = async (req, res, next) => {
  try {
    const filters = {
      search:          normalizeString(req.query.search),
      department:      normalizeString(req.query.department),
      parameter:       normalizeString(req.query.parameter),
      location:        normalizeString(req.query.location),
      jenisKalibrasi:  normalizeJenisKalibrasi(req.query.jenisKalibrasi),
      includeExternal: parseBooleanQuery(req.query.includeExternal, 'includeExternal', true),
    };

    const rows = await repo.listInstruments(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator  = 'eValidasi';
    workbook.created  = new Date();

    const sheet = workbook.addWorksheet('Master Instrumen');

    sheet.columns = [
      { header: 'QA ID',                 key: 'QA_ID',                      width: 18 },
      { header: 'Jenis Instrumen',        key: 'instrument_type',             width: 22 },
      { header: 'Jenis Kalibrasi',        key: 'Jenis_Kalibrasi',             width: 16 },
      { header: 'Nama Instrumen',         key: 'Assm_nama_instrumen',         width: 32 },
      { header: 'No Identitas Instrumen', key: 'Assm_No_identitas_Istrumen',  width: 24 },
      { header: 'No Identitas Kalibrasi', key: 'Assm_No_identitas_kalibrasi', width: 24 },
      { header: 'Bagian',                 key: 'Group_Da_Dept',               width: 14 },
      { header: 'Kapasitas / Resolusi',   key: 'Assm_Kapasitas',              width: 22 },
      { header: 'Parameter Kalibrasi',    key: 'Parameter_Kalibrasi',         width: 22 },
      { header: 'Lokasi',                 key: 'Assm_Lokasi',                 width: 20 },
      { header: 'Tanggal Kalibrasi',      key: 'Tgl_kalibrasi',               width: 18 },
      { header: 'Interval (Bulan)',        key: 'Parameter_Interval',          width: 16 },
      { header: 'Kalibrasi Selanjutnya',  key: 'Kalibrasi_selanjutnya',       width: 22 },
      { header: 'Status',                 key: 'status',                      width: 14 },
      { header: 'Keterangan',             key: 'Catatan',                     width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height    = 20;

    rows.forEach((row) => sheet.addRow(row));

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: sheet.columns.length },
    };

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Master-Instrumen-${timestamp}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/instruments/:instrumentType/:id
 * For Risk_Assessment, :id is source_id/AssessmentID. For DA types, :id is QA_ID.
 */
const getInstrumentByType = async (req, res, next) => {
  try {
    const instrumentType = resolveInstrumentType(req);
    const sourceId = resolveInstrumentSourceId(req);

    if (!instrumentType) throw createBadRequestError('instrument_type is required.');
    if (!sourceId) throw createBadRequestError('Instrument id is required.');

    const data = await repo.getInstrumentByTypeAndId(instrumentType, sourceId);
    if (!data) return res.status(404).json({ message: `Instrument ${sourceId} not found.` });

    res.status(200).json(data);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * POST /api/pressure-calibration/instruments
 * Body must include instrument_type.
 */
const createInstrument = async (req, res, next) => {
  try {
    const instrumentType = resolveInstrumentType(req);
    if (!instrumentType) throw createBadRequestError('instrument_type is required.');

    const data = await repo.createInstrument(instrumentType, req.body || {}, buildInstrumentMeta(req));
    res.status(201).json(data);
  } catch (err) {
    const normalizedErr = normalizeInstrumentWriteError(err);
    if (normalizedErr.statusCode) {
      return res.status(normalizedErr.statusCode).json({ message: normalizedErr.message });
    }
    next(normalizedErr);
  }
};

/**
 * PUT /api/pressure-calibration/instruments/:instrumentType/:id
 * For Risk_Assessment, :id is source_id/AssessmentID. For DA types, :id is QA_ID.
 */
const updateInstrument = async (req, res, next) => {
  try {
    const instrumentType = resolveInstrumentType(req);
    const sourceId = resolveInstrumentSourceId(req);

    if (!instrumentType) throw createBadRequestError('instrument_type is required.');
    if (!sourceId) throw createBadRequestError('Instrument id is required.');

    const data = await repo.updateInstrument(
      instrumentType,
      sourceId,
      req.body || {},
      buildInstrumentMeta(req)
    );

    if (!data) {
      return res.status(404).json({ message: `Instrument ${sourceId} not found.` });
    }

    res.status(200).json(data);
  } catch (err) {
    const normalizedErr = normalizeInstrumentWriteError(err);
    if (normalizedErr.statusCode) {
      return res.status(normalizedErr.statusCode).json({ message: normalizedErr.message });
    }
    next(normalizedErr);
  }
};

/**
 * DELETE /api/pressure-calibration/instruments/:instrumentType/:id
 * For Risk_Assessment, :id is source_id/AssessmentID. For DA types, :id is QA_ID.
 */
const deleteInstrument = async (req, res, next) => {
  try {
    const instrumentType = resolveInstrumentType(req);
    const sourceId = resolveInstrumentSourceId(req);

    if (!instrumentType) throw createBadRequestError('instrument_type is required.');
    if (!sourceId) throw createBadRequestError('Instrument id is required.');

    const deleted = await repo.deleteInstrument(instrumentType, sourceId, buildInstrumentMeta(req));
    if (!deleted) {
      return res.status(404).json({ message: `Instrument ${sourceId} not found.` });
    }

    res.status(200).json({
      success: true,
      message: 'Instrument deleted successfully.',
      data: {
        instrument_type: instrumentType,
        source_id: sourceId,
      },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

// =============================================================================
// CALIBRATION STANDARDS
// =============================================================================

/**
 * GET /api/pressure-calibration/standards
 */
const listStandards = async (req, res, next) => {
  try {
    const data = await repo.listStandards();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/pressure-calibration/standards
 * Body: { standardCode, standardName, certificateNo, traceability, recalibrationDate, unit }
 */
const createStandard = async (req, res, next) => {
  try {
    const standardPayload = buildStandardPayload(req.body);
    const pointsPayload = buildPointsPayload(req.body.points, standardPayload.unit);

    const id = Array.isArray(pointsPayload)
      ? await repo.createStandardWithPoints(standardPayload, pointsPayload)
      : await repo.createStandard(standardPayload);

    res.status(201).json({ standardId: id });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * PUT /api/pressure-calibration/standards/:id
 * Body: { standardCode, standardName, certificateNo, traceability, recalibrationDate, unit, points? }
 */
const updateStandard = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid standard id.' });

    const standardPayload = buildStandardPayload(req.body);
    const pointsPayload = buildPointsPayload(req.body.points, standardPayload.unit);

    const updated = Array.isArray(pointsPayload)
      ? await repo.updateStandardWithPoints(id, standardPayload, pointsPayload)
      : await repo.updateStandard(id, standardPayload);

    if (!updated) return res.status(404).json({ message: `Standard ${id} not found.` });
    res.status(200).json({ standardId: id, updated: true });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * DELETE /api/pressure-calibration/standards/:id
 */
const deleteStandard = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid standard id.' });

    const deleted = await repo.softDeleteStandard(id);
    if (!deleted) return res.status(404).json({ message: `Standard ${id} not found.` });

    res.status(200).json({ standardId: id, deleted: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/standards/:id
 */
const getStandard = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid standard id.' });

    const data = await repo.getStandardById(id);
    if (!data) return res.status(404).json({ message: `Standard ${id} not found.` });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/standards/:id/points
 */
const getStandardPoints = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid standard id.' });

    const data = await repo.getStandardPoints(id);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/pressure-calibration/standards/:id/points
 * Body: { actualPressure, indicatorIncreasing, indicatorDecreasing, uncertainty, unit }
 */
const addStandardPoint = async (req, res, next) => {
  try {
    const standardId = parseInt(req.params.id, 10);
    if (Number.isNaN(standardId)) return res.status(400).json({ message: 'Invalid standard id.' });

    const standard = await repo.getStandardById(standardId);
    if (!standard) return res.status(404).json({ message: `Standard ${standardId} not found.` });

    const pointPayload = buildPointPayload(req.body, 0, normalizeString(req.body.unit) || standard.unit);

    const pointId = await repo.insertStandardPoint({ standardId, ...pointPayload });
    res.status(201).json({ pointId });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

// =============================================================================
// CALIBRATION SESSIONS
// =============================================================================

/**
 * GET /pressure-calibration/sessions
 * Query: ?limit=50
 */
const listSessions = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const data  = await repo.listSessions({ limit });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/pressure-calibration/sessions
 * Body: see calibration.service.js validateSessionInput
 */
const createSession = async (req, res, next) => {
  try {
    // TODO: Replace null with req.user?.user_id when authentication is enabled on this route
    const result = await calSvc.createSession(req.body, null);
    res.status(201).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/sessions/:sessionId
 */
const getSession = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const data = await repo.getSessionById(sessionId);
    if (!data) return res.status(404).json({ message: `Session ${sessionId} not found.` });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// READINGS
// =============================================================================

/**
 * POST /api/pressure-calibration/sessions/:sessionId/readings
 * Body: { readings: [ { pointIndex, nominalValue, cycleCode, direction, uutReading, standardReading } ] }
 */
const saveReadings = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const result = await calSvc.saveReadings(sessionId, req.body);
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/sessions/:sessionId/readings
 */
const getReadings = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const data = await repo.getReadingsBySession(sessionId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// CALCULATE + RESULT
// =============================================================================

/**
 * POST /api/pressure-calibration/sessions/:sessionId/calculate
 * Optional: ?includeWorkbookFormatted=true|false (default: true)
 */
const calculate = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const includeWorkbookFormatted = resolveIncludeWorkbookFormatted(req);
    const result = await calSvc.calculate(sessionId, {
      ...(req.body || {}),
      includeWorkbookFormatted,
    });
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/sessions/:sessionId/result
 * Optional: ?includeWorkbookFormatted=true|false (default: true)
 */
const getResult = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const includeWorkbookFormatted = resolveIncludeWorkbookFormatted(req);
    const result = await calSvc.getResult(sessionId, { includeWorkbookFormatted });
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

module.exports = {
  listInstruments,
  getDaBagianHistory,
  exportInstruments,
  getInstrument,
  getInstrumentByType,
  createInstrument,
  updateInstrument,
  deleteInstrument,
  listStandards,
  createStandard,
  updateStandard,
  deleteStandard,
  getStandard,
  getStandardPoints,
  addStandardPoint,
  listSessions,
  createSession,
  getSession,
  saveReadings,
  getReadings,
  calculate,
  getResult,
};
