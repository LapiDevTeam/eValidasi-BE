const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterPemasokRouter = require("./master-pemasok");
const masterItemOri = require("./master-item-ori");
const masterItemBahanKemasTemplateRouter = require("./master-item-bahan-kemas-template");

// masterRouter.use(authentication);
masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/pemasok", masterPemasokRouter);
masterRouter.use("/item-ori", masterItemOri);
masterRouter.use("/bahan-kemas-template", masterItemBahanKemasTemplateRouter);

module.exports = masterRouter;
