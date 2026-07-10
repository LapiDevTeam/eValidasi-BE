'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/timbangan-calibration.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

// Sessions
router.get('/timbangan-sessions', controller.listSessions);
router.get('/timbangan-sessions/hysteresis', controller.getPublishedHysteresisByCertificate);
router.get('/timbangan-sessions/:sessionId', controller.getSession);
router.post('/timbangan-sessions', controller.createSession);
router.put('/timbangan-sessions/:sessionId', controller.updateSession);
router.delete('/timbangan-sessions/:sessionId', controller.deleteSession);

// Workbook data (all sub-tests, replace-all)
router.put('/timbangan-sessions/:sessionId/workbook', controller.saveWorkbook);

// Calculation / results / approval
router.post('/timbangan-sessions/:sessionId/calculate', controller.calculate);
router.get('/timbangan-sessions/:sessionId/results', controller.getResults);
router.post('/timbangan-sessions/:sessionId/finalize', controller.finalize);
router.post('/timbangan-sessions/:sessionId/approve', controller.approveSession);
router.post('/timbangan-sessions/:sessionId/reject', controller.rejectSession);

// Anak Timbangan (AT) master
router.get('/timbangan-at-standards', controller.listAtStandards);
router.get('/timbangan-at-standards/:noId', controller.lookupAt);

// Certificate
router.get('/timbangan-da-candidates', controller.listDaCandidates);
router.post('/timbangan-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;
