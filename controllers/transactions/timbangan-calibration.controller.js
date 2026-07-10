'use strict';

/**
 * timbangan-calibration.controller.js
 * HTTP handlers for the Timbangan (electronic balance) Calibration module.
 * All business logic lives in src/services/timbanganCalculation.service.js.
 */

const repo = require('../../repositories/timbangan-calibration.repository');
const calc = require('../../src/services/timbanganCalculation.service');

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

// ---------------------------------------------------------------------------
// SESSIONS
// ---------------------------------------------------------------------------

async function listSessions(req, res, next) {
  try {
    const data = await repo.listSessions({ status: req.query.status });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function getPublishedHysteresisByCertificate(req, res, next) {
  try {
    const qaId = String(req.query.qa_id || '').trim();
    const idNoSertifikat = String(req.query.id_no_sertifikat || '').trim();

    if (!qaId || !idNoSertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      throw err;
    }

    const data = await repo.getPublishedHysteresisByCertificate({
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
    });

    if (!data) {
      const err = new Error('Published timbangan hysteresis summary not found');
      err.statusCode = 404;
      throw err;
    }

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
    const result = await calc.createSession(req.body || {}, getChangedBy(req));
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function updateSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const result = await calc.updateSession(sessionId, req.body || {}, getChangedBy(req));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function deleteSession(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const ok = await repo.deleteSessionGraph(sessionId);
    return res.status(200).json({ success: true, data: { deleted: ok } });
  } catch (error) {
    return sendError(res, next, error);
  }
}

// ---------------------------------------------------------------------------
// WORKBOOK / CALCULATE / RESULTS / FINALIZE
// ---------------------------------------------------------------------------

async function saveWorkbook(req, res, next) {
  try {
    const sessionId = parseIntParam(req.params.sessionId, 'sessionId');
    const result = await calc.saveWorkbook(sessionId, req.body || {});
    return res.status(200).json({ success: true, data: result });
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

// ---------------------------------------------------------------------------
// AT MASTER (Anak Timbangan)
// ---------------------------------------------------------------------------

async function listAtStandards(req, res, next) {
  try {
    const data = await calc.listAtStandards({ search: String(req.query.search || '').trim() || undefined });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

async function lookupAt(req, res, next) {
  try {
    const data = await calc.lookupAt(req.params.noId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, next, error);
  }
}

// ---------------------------------------------------------------------------
// CERTIFICATE
// ---------------------------------------------------------------------------

async function listDaCandidates(req, res, next) {
  try {
    const includeExternal = req.query.includeExternal === undefined
      ? undefined
      : ['1', 'true', 'yes', 'on'].includes(String(req.query.includeExternal).trim().toLowerCase());
    const data = await calc.listDaCandidates({
      qa_id: req.query.qa_id,
      instrument_code: req.query.instrument_code,
      search: String(req.query.search || '').trim() || undefined,
      include_external: includeExternal,
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
  getPublishedHysteresisByCertificate,
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
  listAtStandards,
  lookupAt,
  listDaCandidates,
  publishSertifikat,
};
