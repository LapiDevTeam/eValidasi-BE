const express = require('express');
const trxKoreksiStockRDRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { sbCekButton, cmdFindData1, cmdFindData2, cmdDelete, cmdApprove, getDetailGrid, cmdSave } = require('../../controllers/master-vb/trx-koreksi-stockRD.controller');


trxKoreksiStockRDRouter.get('/cekbuttons', authentication, sbCekButton);
trxKoreksiStockRDRouter.get('/getdocuments', authentication, cmdFindData1);
trxKoreksiStockRDRouter.get('/getdetailgrid', authentication, getDetailGrid);
trxKoreksiStockRDRouter.get('/getkodebahan', authentication, cmdFindData2);

trxKoreksiStockRDRouter.delete('/deletekoreksi', authentication, cmdDelete);
trxKoreksiStockRDRouter.post('/approve', authentication, cmdApprove);
trxKoreksiStockRDRouter.post('/save', authentication, cmdSave);



module.exports = trxKoreksiStockRDRouter;
