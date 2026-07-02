'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/timer-calibration.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

// Sessions
router.get('/timer-sessions', controller.listSessions);
router.get('/timer-sessions/:sessionId', controller.getSession);
router.post('/timer-sessions', controller.createSession);
router.put('/timer-sessions/:sessionId', controller.updateSession);
router.delete('/timer-sessions/:sessionId', controller.deleteSession);

// Workbook data (points + 10-cycle readings, replace-all)
router.put('/timer-sessions/:sessionId/workbook', controller.saveWorkbook);

// Calculation / results / approval
router.post('/timer-sessions/:sessionId/calculate', controller.calculate);
router.get('/timer-sessions/:sessionId/results', controller.getResults);
router.post('/timer-sessions/:sessionId/finalize', controller.finalize);
router.post('/timer-sessions/:sessionId/approve', controller.approveSession);
router.post('/timer-sessions/:sessionId/reject', controller.rejectSession);

// Certificate
router.get('/timer-da-candidates', controller.listDaCandidates);
router.post('/timer-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;
