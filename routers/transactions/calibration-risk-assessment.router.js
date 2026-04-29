'use strict';

const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  patchAssessmentStatus,
} = require('../../controllers/transactions/calibration-risk-assessment.controller');

// All routes require authentication
router.use(authentication);

// POST   /api/calibration-risk-assessments        – Create new assessment
router.post('/', createAssessment);

// GET    /api/calibration-risk-assessments        – List assessments (with filters)
router.get('/', getAssessments);

// GET    /api/calibration-risk-assessments/:id    – Get assessment detail
router.get('/:id', getAssessmentById);

// PUT    /api/calibration-risk-assessments/:id    – Update assessment (full update)
router.put('/:id', updateAssessment);

// DELETE /api/calibration-risk-assessments/:id    – Soft delete
router.delete('/:id', deleteAssessment);

// PATCH  /api/calibration-risk-assessments/:id/status  – Update status only
router.patch('/:id/status', patchAssessmentStatus);

module.exports = router;
