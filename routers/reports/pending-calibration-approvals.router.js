'use strict';

const express = require('express');
const router = express.Router();

const { authentication } = require('../../middlewares/authentication');
const ctrl = require('../../controllers/reports/pending-calibration-approvals.controller');

router.get('/', authentication, ctrl.listPendingApprovals);
router.post('/:module/:sessionId/approve', authentication, ctrl.approveSession);
router.post('/:module/:sessionId/reject', authentication, ctrl.rejectSession);

module.exports = router;
