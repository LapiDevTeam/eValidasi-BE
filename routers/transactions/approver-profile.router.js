'use strict';

const express = require('express');
const { authentication } = require('../../middlewares/authentication');
const controller = require('../../controllers/transactions/approver-profile.controller');

const router = express.Router();

router.get('/', authentication, controller.listApproverProfiles);

module.exports = router;
