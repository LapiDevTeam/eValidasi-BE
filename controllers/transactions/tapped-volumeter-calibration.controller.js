'use strict';

const repo = require('../../repositories/tapped-volumeter-calibration.repository');
const calc = require('../../src/services/tappedVolumeterCalculation.service');

function parseIntParam(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const err = new Error(`Invalid ${label}.`);
    err.statusCode = 400;
    throw err;
  }
  return n;
}

function getChangedBy(req) {
  return req?.user?.user_id || req?.user?.log_NIK || req?.body?.changedBy || null;
}

function getDelegatedTo(req, fallback) {
  return req?.user?.delegated_to || req?.body?.delegated_to || fallback;
}

function sendError(res, next, error) {
  let response;
  if (error.statusCode && error.validation) {
    response = res.status(error.statusCode).json({ success: false, message: error.message || 'Validation failed', errors: error.validation });
  } else if (error.statusCode) {
    response = res.status(error.statusCode).json({ success: false, message: error.message });
  } else {
    console.error('[error-logger-fix] unexpected error:', error);
    response = res.status(500).json({ success: false, message: 'Internal server error' });
  }

  // Propagate to global error middleware so the mutation error logger can record it.
  next(error);
  return response;
}

async function listSessions(req, res, next) {
  try {
    const data = await repo.listSessions({ status: req.query.status });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function getSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.getSessionBundle(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function createSession(req, res, next) {
  try {
    const data = await calc.createSession(req.body || {}, getChangedBy(req));
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function updateSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.updateSession(sessionId, req.body || {}, getChangedBy(req));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function deleteSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const deleted = await repo.deleteSessionGraph(sessionId);
    return res.status(200).json({ success: true, data: { deleted } });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function saveWorkbook(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.saveWorkbook(sessionId, req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function calculate(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.calculate(sessionId, getChangedBy(req));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function getResults(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.getResults(sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function finalize(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.finalize(sessionId, getChangedBy(req));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function approveSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const data = await calc.approveSession(sessionId, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function rejectSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const { reason } = req.body || {};
    const data = await calc.rejectSession(sessionId, req.user, reason);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function listDaCandidates(req, res, next) {
  try {
    const data = await calc.listDaCandidates({
      qa_id: req.query.qa_id,
      instrument_code: req.query.instrument_code,
      search: String(req.query.search || '').trim() || undefined,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function publishSertifikat(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const changedBy = getChangedBy(req);
    const delegatedTo = getDelegatedTo(req, changedBy);
    const data = await calc.publishToSertifikat(sessionId, changedBy, delegatedTo, req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  saveWorkbook,
  calculate,
  getResults,
  finalize,
  approveSession,
  rejectSession,
  listDaCandidates,
  publishSertifikat,
};
