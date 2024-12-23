const express = require("express");
const masterPemasokRouter = express.Router();
const MasterPemasokController = require("../../controllers/master-vb/master-pemasok-controller");
const { authentication } = require("../../middlewares/authentication");

masterPemasokRouter.get(
  "/print",
  MasterPemasokController.downloadExcelMasterPemasok
);
masterPemasokRouter.use(authentication)
masterPemasokRouter.get("/", MasterPemasokController.fetchMasterPemasok);


module.exports = masterPemasokRouter;
