'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/disintegration-calibration.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

router.get('/disintegration-sessions', controller.listSessions);
router.get('/disintegration-sessions/:sessionId', controller.getSession);
router.post('/disintegration-sessions', controller.createSession);
router.put('/disintegration-sessions/:sessionId', controller.updateSession);
router.delete('/disintegration-sessions/:sessionId', controller.deleteSession);
router.put('/disintegration-sessions/:sessionId/workbook', controller.saveWorkbook);
router.post('/disintegration-sessions/:sessionId/calculate', controller.calculate);
router.get('/disintegration-sessions/:sessionId/results', controller.getResults);
router.post('/disintegration-sessions/:sessionId/finalize', controller.finalize);
router.post('/disintegration-sessions/:sessionId/approve', controller.approveSession);
router.post('/disintegration-sessions/:sessionId/reject', controller.rejectSession);
router.get('/disintegration-da-candidates', controller.listDaCandidates);
router.post('/disintegration-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;
