const express = require("express");
const masterPemasokRouter = express.Router();
const MasterPemasokController = require("../../controllers/master-vb/master-pemasok-controller");

masterPemasokRouter.get("/", MasterPemasokController.fetchMasterPemasok);
masterPemasokRouter.get(
  "/print",
  MasterPemasokController.downloadExcelMasterPemasok
);

module.exports = masterPemasokRouter;
