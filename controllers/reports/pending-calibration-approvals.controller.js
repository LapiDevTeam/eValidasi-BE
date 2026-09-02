'use strict';

/**
 * Pending Calibration Approvals Controller
 *
 * Reports endpoint for VN managers and other approvers to list and act on
 * pending calibration workbook approvals across all instrument modules.
 */

const service = require('../../services/pendingCalibrationApprovals.service');

function normalizeSearch(search) {
  const text = String(search || '').trim();
  return text && text !== '%' ? text : '';
}

function normalizeRequester(requester) {
  const text = String(requester || '').trim();
  return text && text !== '%' ? text : '';
}

function getUser(req) {
  return req?.user || {};
}

const BAGIAN_MODULES = new Set([
  'da-bagian',
  'sertifikat-bagian',
  'da-thermo',
  'sertifikat-thermo',
  'kalibrasi-eksternal',
]);

const MASTER_MODULES = new Set([
  'master-awp',
  'master-map-internal',
  'master-map-external',
]);

function isBagianModule(module) {
  return BAGIAN_MODULES.has(String(module || '').toLowerCase());
}

function isMasterModule(module) {
  return MASTER_MODULES.has(String(module || '').toLowerCase());
}

function validateSessionId(module, sessionId) {
  if (!sessionId) return 'Session ID is required';
  if (isBagianModule(module)) return '';
  const numericSessionId = Number(sessionId);
  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    return 'Positive numeric sessionId is required';
  }
  return '';
}

const listPendingApprovals = async (req, res, next) => {
  try {
    const user = getUser(req);
    const moduleFilter = req.query.module || '';
    const search = normalizeSearch(req.query.search);
    const requester = normalizeRequester(req.query.requester);
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    const { results: data, scanErrors } = await service.listPendingApprovals({
      bagian_user: user.bagian_user,
      moduleFilter,
      search,
      requester,
      limit,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
      scanErrors,
    });
  } catch (error) {
    console.error('Error in listPendingApprovals:', error);
    next(error);
  }
};

const approveSession = async (req, res, next) => {
  try {
    const user = getUser(req);
    const { module: moduleSlug, sessionId } = req.params;

    if (!moduleSlug) {
      return res.status(400).json({
        success: false,
        message: 'Module slug is required',
      });
    }

    const sessionError = validateSessionId(moduleSlug, sessionId);
    if (sessionError) {
      return res.status(400).json({
        success: false,
        message: sessionError,
      });
    }

    const result = await service.approveSession(
      moduleSlug,
      sessionId,
      user,
      req.body || {}
    );

    return res.status(200).json({
      success: true,
      message: isBagianModule(moduleSlug) || isMasterModule(moduleSlug)
        ? 'Item approved successfully'
        : `Workbook approved by ${result.approvedByLabel}`,
      data: result,
    });
  } catch (error) {
    console.error('Error in approveSession:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const rejectSession = async (req, res, next) => {
  try {
    const user = getUser(req);
    const { module: moduleSlug, sessionId } = req.params;
    const { reason } = req.body || {};

    if (!moduleSlug) {
      return res.status(400).json({
        success: false,
        message: 'Module slug is required',
      });
    }

    const sessionError = validateSessionId(moduleSlug, sessionId);
    if (sessionError) {
      return res.status(400).json({
        success: false,
        message: sessionError,
      });
    }

    const result = await service.rejectSession(
      moduleSlug,
      sessionId,
      user,
      reason
    );

    return res.status(200).json({
      success: true,
      message: isBagianModule(moduleSlug) || isMasterModule(moduleSlug)
        ? 'Item rejected successfully'
        : 'Workbook rejected successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in rejectSession:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  listPendingApprovals,
  approveSession,
  rejectSession,
};
