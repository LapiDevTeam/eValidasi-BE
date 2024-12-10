const express = require("express");
const MasterItemBahanAwalController = require("../../controllers/master-vb/master-item-bahan-awal");
const masterItemBahanAwal = express.Router();

masterItemBahanAwal.get(
  "/item-group",
  MasterItemBahanAwalController.fetchItemGroup
);
masterItemBahanAwal.get(
  "/export",
  MasterItemBahanAwalController.downloadExcelExportItemBahanAwal
);

module.exports = masterItemBahanAwal;
