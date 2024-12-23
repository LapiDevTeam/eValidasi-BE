const express = require("express");
const MasterItemOriController = require("../../controllers/master-vb/master-item-ori-controller");
const { authentication } = require("../../middlewares/authentication");
const masterItemOri = express.Router();

masterItemOri.get(
  "/export",
  MasterItemOriController.downloadExcelExportItemOri
);
masterItemOri.use(authentication)
masterItemOri.get("/item-group", MasterItemOriController.fetchItemGroupOri);

module.exports = masterItemOri;
