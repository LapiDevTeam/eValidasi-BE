const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterBahanAwalTemplate = require("./master-bahan-awal-template.routes");
const masterPemasokRouter = require("./master-pemasok");
const masterItemOri = require("./master-item-ori");
const masterItemBahanKemasTemplateRouter = require("./master-item-bahan-kemas-template");

masterRouter.use(authentication);

masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/pemasok", masterPemasokRouter);
masterRouter.use("/item-ori", masterItemOri);
masterRouter.use(
  "/item-bahan-kemas-template",
  masterItemBahanKemasTemplateRouter
);
masterRouter.use("/item-bahan-awal-template", masterBahanAwalTemplate);

module.exports = masterRouter;
