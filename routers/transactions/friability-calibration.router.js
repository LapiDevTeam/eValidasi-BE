'use strict';

const express = require('express');
const router = express.Router();

const { authentication } = require('../../middlewares/authentication');
const ctrl = require('../../controllers/transactions/friability-calibration.controller');

router.get('/print-data', ctrl.getPrintData);
router.get('/sessions', authentication, ctrl.listSessions);
router.get('/sessions/:sessionId', authentication, ctrl.getSession);
router.post('/sessions', authentication, ctrl.saveSession);
router.put('/sessions/:sessionId', authentication, ctrl.saveSession);
router.post('/sessions/:sessionId/approve', authentication, ctrl.approveSession);
router.post(
  '/sessions/:sessionId/generate-sertifikat',
  authentication,
  ctrl.generateFriabilitySertifikat
);

module.exports = router;

