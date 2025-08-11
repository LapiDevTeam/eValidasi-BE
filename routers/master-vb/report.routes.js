const express = require('express');
const reportRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { generateDPBA, exportPrinciples, getPrinciples, exportSuppliers, getSuppliers } = require('../../controllers/master-vb/report-view-DPBA.controller');
const { getFormulaByItem, getPPIItems, exportProductionHistory } = require('../../controllers/master-vb/report-simulasiPPI.controller');
const { exportDPBAToExcel } = require('../../controllers/master-vb/master-bahan-awal-template.controller');


reportRouter.get('/view-dpba-ori', generateDPBA)
reportRouter.get('/export-dpba', authentication, exportDPBAToExcel)
reportRouter.get('/export-dpba-principle', exportPrinciples)
reportRouter.get('/get-principle', getPrinciples)

reportRouter.get('/export-dpba-supplier', exportSuppliers)
reportRouter.get('/get-supplier', getSuppliers)


reportRouter.get('/get-itemppi', getPPIItems)
reportRouter.get('/get-simulasippi', getFormulaByItem)

reportRouter.get('/export-prodhist', exportProductionHistory)




module.exports = reportRouter;
