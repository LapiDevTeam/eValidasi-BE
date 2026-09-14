'use strict';

const express = require('express');
const {
  getUnitConditions,
  getMonthlySummary,
} = require('../../controllers/cms/dashboard.controller');
const { authentication } = require('../../middlewares/authentication');

const router = express.Router();

router.get('/unit-conditions', authentication, getUnitConditions);
router.get('/monthly-summary', authentication, getMonthlySummary);

module.exports = router;
