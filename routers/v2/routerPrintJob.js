/**
 * Print Job Router
 * Handles silent printing requests from frontend
 * Jobs are picked up by Local Print Agent
 */

const express = require('express');
const router = express.Router();
const printJobController = require('../../controllers/v2/print-job.controller');
const { authentication } = require('../../middlewares/authentication');

// Optional authentication middleware - allows anonymous access
const optionalAuth = (req, res, next) => {
  const token = req.headers.authentication || req.headers.authorization;
  if (token) {
    return authentication(req, res, next);
  }
  req.user = null;
  next();
};

/**
 * @route POST /api/v2/print-job
 * @desc Create a new print job
 * @access Public (auth optional)
 */
router.post('/print-job', optionalAuth, printJobController.createPrintJob);

/**
 * @route GET /api/v2/print-job
 * @desc Get pending print jobs for agent (polling endpoint)
 * @access Public (no auth required)
 */
router.get('/print-job', printJobController.getPendingJobs);

/**
 * @route GET /api/v2/print-job/:jobId
 * @desc Get specific print job status
 * @access Public (no auth required)
 */
router.get('/print-job/:jobId', printJobController.getJobStatus);

/**
 * @route GET /api/v2/print-job/:jobId/download
 * @desc Download print job PDF (with token validation)
 * @access Private (Token-based)
 */
router.get('/print-job/:jobId/download', printJobController.downloadJobFile);

/**
 * @route PATCH /api/v2/print-job/:jobId/status
 * @desc Update job status (agent reports completion/failure)
 * @access Public (no auth required)
 */
router.patch('/print-job/:jobId/status', printJobController.updateJobStatus);

/**
 * @route GET /api/v2/printer-profiles
 * @desc Get available printer profiles for user
 * @access Public (no auth required)
 */
router.get('/printer-profiles', printJobController.getPrinterProfiles);

/**
 * @route POST /api/v2/printer-profiles
 * @desc Create or update printer profile
 * @access Public (no auth required)
 */
router.post('/printer-profiles', printJobController.savePrinterProfile);

module.exports = router;
