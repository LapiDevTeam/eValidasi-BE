const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterPemasokRouter = require("./master-pemasok");
const masterItemBahanAwal = require("./master-item-bahan-awal");

// masterRouter.use(authentication);
masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/pemasok", masterPemasokRouter);
masterRouter.use("/item-bahan-awal", masterItemBahanAwal);

module.exports = masterRouter;
