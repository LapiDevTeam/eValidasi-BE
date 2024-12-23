const express = require("express");
const masterPembuatRouter = express.Router();
const MasterPembuatController = require("../../controllers/master-vb/master-pembuat-controller");
const { authentication } = require("../../middlewares/authentication");

masterPembuatRouter.get(
  "/print",
  MasterPembuatController.downloadExcelMasterPembuat
);
masterPembuatRouter.use(authentication)
masterPembuatRouter.get("/", MasterPembuatController.fetchMasterPembuat);
masterPembuatRouter.post(
  "/",
  MasterPembuatController.createOrUpdateMasterPembuat
);


module.exports = masterPembuatRouter;
