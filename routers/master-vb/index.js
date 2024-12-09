const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterBahanAwalTemplate = require("./master-bahan-awal-template.routes");

// masterRouter.use(authentication);
masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/bahan-awal-template", masterBahanAwalTemplate);

module.exports = masterRouter;
