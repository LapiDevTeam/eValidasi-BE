const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");

// masterRouter.use(authentication);
masterRouter.use("/pembuat", masterPembuatRouter);

module.exports = masterRouter;
