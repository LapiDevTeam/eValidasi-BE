const express = require("express");
const masterPembuatRouter = express.Router();
const MasterPembuatController = require("../../controllers/master-vb/master-pembuat-controller");

masterPembuatRouter.get("/", MasterPembuatController.fetchMasterPembuat);
masterPembuatRouter.post(
  "/",
  MasterPembuatController.createOrUpdateMasterPembuat
);

module.exports = masterPembuatRouter;
