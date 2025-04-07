const express = require('express');
const reportRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { generateDPBA, exportPrinciples, getPrinciples, exportSuppliers, getSuppliers } = require('../../controllers/master-vb/report-view-DPBA.controller');


reportRouter.get('/view-dpba-ori', generateDPBA)
reportRouter.get('/export-dpba-principle', exportPrinciples)
reportRouter.get('/get-principle', getPrinciples)

reportRouter.get('/export-dpba-supplier', exportSuppliers)
reportRouter.get('/get-supplier', getSuppliers)

module.exports = reportRouter;
