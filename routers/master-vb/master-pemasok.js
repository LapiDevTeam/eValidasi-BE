const express = require("express");
const masterPemasokRouter = express.Router();
const MasterPemasokController = require("../../controllers/master-vb/master-pemasok-controller");

masterPemasokRouter.get("/", MasterPemasokController.fetchMasterPembuat);
// masterPemasokRouter.post(
//   "/",
//   MasterPemasokController.createOrUpdateMasterPembuat
// );
masterPemasokRouter.get(
  "/print",
  MasterPemasokController.downloadExcelMasterPembuat
);

module.exports = masterPemasokRouter;
