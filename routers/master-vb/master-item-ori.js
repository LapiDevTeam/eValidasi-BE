const express = require("express");
const MasterItemOriController = require("../../controllers/master-vb/master-item-ori-controller");
const masterItemOri = express.Router();

masterItemOri.get("/item-group", MasterItemOriController.fetchItemGroupOri);
masterItemOri.get(
  "/export",
  MasterItemOriController.downloadExcelExportItemOri
);

module.exports = masterItemOri;
