'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/tapped-volumeter-calibration.controller');

const router = express.Router();

// All routes require authentication.
router.use(authentication);

router.get('/tapped-volumeter-sessions', controller.listSessions);
router.get('/tapped-volumeter-sessions/:sessionId', controller.getSession);
router.post('/tapped-volumeter-sessions', controller.createSession);
router.put('/tapped-volumeter-sessions/:sessionId', controller.updateSession);
router.delete('/tapped-volumeter-sessions/:sessionId', controller.deleteSession);
router.put('/tapped-volumeter-sessions/:sessionId/workbook', controller.saveWorkbook);
router.post('/tapped-volumeter-sessions/:sessionId/calculate', controller.calculate);
router.get('/tapped-volumeter-sessions/:sessionId/results', controller.getResults);
router.post('/tapped-volumeter-sessions/:sessionId/finalize', controller.finalize);
router.post('/tapped-volumeter-sessions/:sessionId/approve', controller.approveSession);
router.post('/tapped-volumeter-sessions/:sessionId/reject', controller.rejectSession);
router.get('/tapped-volumeter-da-candidates', controller.listDaCandidates);
router.post('/tapped-volumeter-sessions/:sessionId/publish-sertifikat', controller.publishSertifikat);

module.exports = router;
