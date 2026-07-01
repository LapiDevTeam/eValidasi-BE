'use strict';

const express = require('express');
const { getUnitConditions } = require('../../controllers/cms/dashboard.controller');
const { authentication } = require('../../middlewares/authentication');

const router = express.Router();

router.get('/unit-conditions', authentication, getUnitConditions);

module.exports = router;
