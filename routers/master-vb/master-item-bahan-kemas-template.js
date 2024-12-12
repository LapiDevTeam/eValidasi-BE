const express = require("express");
const MasterItemBahanKemasTemplateController = require("../../controllers/master-vb/master-item-bahan-kemas-template-controller");
const masterItemBahanKemasTemplateRouter = express.Router();

masterItemBahanKemasTemplateRouter.get(
  "/item-group-template",
  MasterItemBahanKemasTemplateController.fetchItemWithGroupTemplate
);
masterItemBahanKemasTemplateRouter.get(
  "/export",
  MasterItemBahanKemasTemplateController.downloadExcelExportItemTemplate
);

module.exports = masterItemBahanKemasTemplateRouter;
