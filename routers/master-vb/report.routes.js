const express = require('express');
const reportRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { generateDPBA } = require('../../controllers/master-vb/report-view-DPBA.controller');


reportRouter.get('/view-dpba-ori', generateDPBA)

module.exports = reportRouter;
