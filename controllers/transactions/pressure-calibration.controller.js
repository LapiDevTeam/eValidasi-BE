'use strict';

/**
 * pressure-calibration.controller.js
 *
 * Handles HTTP layer for the pressure calibration module.
 * Delegates all business logic to calibration.service.js.
 * Delegates all MSSQL I/O to pressure-calibration.repository.js.
 */

const repo   = require('../../repositories/pressure-calibration.repository');
const calSvc = require('../../services/pressure-calibration/calibration.service');

// =============================================================================
// INSTRUMENTS  (read-only, references existing master table)
// =============================================================================

/**
 * GET /api/pressure-calibration/instruments
 * Optional: ?search=<text> to filter by qa_id / name / code
 */
const listInstruments = async (req, res, next) => {
  try {
    const data = await repo.listInstruments(req.query.search || null);
    res.status(200).json(data);
  } catch (err) {
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
    const { standardName } = req.body;
    if (!standardName) return res.status(400).json({ message: 'standardName is required.' });

    const id = await repo.createStandard(req.body);
    res.status(201).json({ standardId: id });
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

    const { actualPressure, indicatorIncreasing, indicatorDecreasing } = req.body;
    if (actualPressure === undefined || indicatorIncreasing === undefined || indicatorDecreasing === undefined) {
      return res.status(400).json({
        message: 'actualPressure, indicatorIncreasing, and indicatorDecreasing are required.',
      });
    }

    const pointId = await repo.insertStandardPoint({ standardId, ...req.body });
    res.status(201).json({ pointId });
  } catch (err) {
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
 */
const calculate = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const result = await calSvc.calculate(sessionId);
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

/**
 * GET /api/pressure-calibration/sessions/:sessionId/result
 */
const getResult = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);
    if (Number.isNaN(sessionId)) return res.status(400).json({ message: 'Invalid session id.' });

    const result = await calSvc.getResult(sessionId);
    res.status(200).json(result);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

module.exports = {
  listInstruments,
  getInstrument,
  listStandards,
  createStandard,
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
