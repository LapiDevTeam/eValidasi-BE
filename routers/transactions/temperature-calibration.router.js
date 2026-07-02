'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/temperature-calibration.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

router.get('/temperature-sessions', controller.listSessions);
router.get('/temperature-sessions/:sessionId', controller.getSession);
router.post('/temperature-sessions', controller.createSession);
router.put('/temperature-sessions/:sessionId', controller.updateSession);
router.delete('/temperature-sessions/:sessionId', controller.deleteSession);
router.put('/temperature-sessions/:sessionId/workbook', controller.saveWorkbook);
router.post('/temperature-sessions/:sessionId/calculate', controller.calculate);
router.get('/temperature-sessions/:sessionId/results', controller.getResults);
router.post('/temperature-sessions/:sessionId/finalize', controller.finalize);
router.post('/temperature-sessions/:sessionId/approve', controller.approveSession);
router.post('/temperature-sessions/:sessionId/reject', controller.rejectSession);
router.get('/temperature-da-candidates', controller.listDaCandidates);
router.post('/temperature-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;

