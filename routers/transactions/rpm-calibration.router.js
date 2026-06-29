'use strict';

const express = require('express');
const controller = require('../../controllers/transactions/rpm-calibration.controller');

const router = express.Router();

router.get('/rpm-sessions', controller.listSessions);
router.get('/rpm-sessions/:sessionId', controller.getSession);
router.post('/rpm-sessions', controller.createSession);
router.put('/rpm-sessions/:sessionId', controller.updateSession);
router.delete('/rpm-sessions/:sessionId', controller.deleteSession);
router.put('/rpm-sessions/:sessionId/workbook', controller.saveWorkbook);
router.post('/rpm-sessions/:sessionId/calculate', controller.calculate);
router.get('/rpm-sessions/:sessionId/results', controller.getResults);
router.post('/rpm-sessions/:sessionId/finalize', controller.finalize);
router.get('/rpm-da-candidates', controller.listDaCandidates);
router.post('/rpm-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;
