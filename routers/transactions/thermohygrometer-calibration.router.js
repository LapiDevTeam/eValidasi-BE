'use strict';

const express = require('express');
const router = express.Router();

const { authentication } = require('../../middlewares/authentication');
const ctrl = require('../../controllers/transactions/thermohygrometer-calibration.controller');

router.get('/certificates', authentication, ctrl.searchCertificates);
router.get('/workbook-header', authentication, ctrl.getWorkbookHeader);
router.post('/workbook-header', authentication, ctrl.saveWorkbookHeader);
router.get('/sessions', authentication, ctrl.listSessions);
router.get('/sessions/:sessionId', authentication, ctrl.getSession);
router.post('/sessions', authentication, ctrl.saveSession);
router.put('/sessions/:sessionId', authentication, ctrl.saveSession);

module.exports = router;
