'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/calibration-workbook.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

// Sessions
router.get('/calibration-sessions', controller.listCalibrationSessions);
router.get('/calibration-sessions/:sessionId', controller.getCalibrationSession);
router.post('/calibration-sessions', controller.createCalibrationSession);
router.put('/calibration-sessions/:sessionId', controller.updateCalibrationSession);
router.delete('/calibration-sessions/:sessionId', controller.deleteCalibrationSession);
router.post('/calibration-sessions/:sessionId/finalize', controller.finalizeCalibrationSession);
router.post('/calibration-sessions/:sessionId/approve', controller.approveSession);
router.post('/calibration-sessions/:sessionId/reject', controller.rejectSession);
router.post(
  '/calibration-sessions/:sessionId/evaluation-result',
  controller.updateEvaluationResult
);
router.post(
  '/calibration-sessions/:sessionId/publish-sertifikat-bagian',
  controller.publishSertifikatBagian
);

// Nominal points
router.get('/calibration-sessions/:sessionId/points', controller.listNominalPoints);
router.post('/calibration-sessions/:sessionId/points', controller.createNominalPoint);
router.put('/calibration-points/:pointId', controller.updateNominalPoint);
router.delete('/calibration-points/:pointId', controller.deleteNominalPoint);

// Readings
router.get('/calibration-sessions/:sessionId/readings', controller.listReadings);
router.post('/calibration-sessions/:sessionId/readings', controller.createReading);
router.put('/calibration-readings/:readingId', controller.updateReading);
router.delete('/calibration-readings/:readingId', controller.deleteReading);
router.post('/calibration-sessions/:sessionId/readings/bulk-upsert', controller.bulkUpsertReadings);

// Regression inputs
router.get('/calibration-sessions/:sessionId/regression-inputs', controller.listRegressionInputs);
router.post('/calibration-sessions/:sessionId/regression-inputs', controller.createRegressionInput);
router.put('/calibration-regression-inputs/:regressionId', controller.updateRegressionInput);
router.delete('/calibration-regression-inputs/:regressionId', controller.deleteRegressionInput);

// Level correction
router.get('/calibration-sessions/:sessionId/level-correction', controller.getLevelCorrection);
router.put('/calibration-sessions/:sessionId/level-correction', controller.updateLevelCorrection);

// Uncertainty inputs
router.get('/calibration-sessions/:sessionId/uncertainty-inputs', controller.getUncertaintyInputs);
router.put('/calibration-sessions/:sessionId/uncertainty-inputs', controller.updateUncertaintyInputs);

// Calculation
router.post('/calibration-sessions/:sessionId/calculate', controller.calculateSession);
router.get('/calibration-sessions/:sessionId/results', controller.getResults);
router.get('/calibration-sessions/:sessionId/summary', controller.getSummary);

// Pressure conversion
router.get('/pressure-conversions', controller.listPressureConversions);
router.post('/pressure-conversions', controller.createPressureConversion);
router.put('/pressure-conversions/:conversionId', controller.updatePressureConversion);
router.delete('/pressure-conversions/:conversionId', controller.deletePressureConversion);

module.exports = router;
