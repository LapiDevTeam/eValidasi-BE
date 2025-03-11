const express = require('express');
const trxKoreksiStockRDRouter = express.Router();

const { authentication } = require('../../middlewares/authentication');
const { sbCekButton } = require('../../controllers/master-vb/trx-koreksi-stockRD.controller');


trxKoreksiStockRDRouter.get('/cekbuttons', authentication, sbCekButton);



module.exports = trxKoreksiStockRDRouter;
