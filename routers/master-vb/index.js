const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterBahanAwalTemplate = require("./master-bahan-awal-template.routes");
const masterPemasokRouter = require("./master-pemasok");
const masterItemBahanAwal = require("./master-item-bahan-awal");

// masterRouter.use(authentication);
masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/pemasok", masterPemasokRouter);
masterRouter.use("/item-bahan-awal", masterItemBahanAwal);
masterRouter.use("/item-bahan-awal-template", masterBahanAwalTemplate);


module.exports = masterRouter;
