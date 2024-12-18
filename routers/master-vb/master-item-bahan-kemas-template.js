const express = require("express");
const MasterItemBahanKemasTemplateController = require("../../controllers/master-vb/master-item-bahan-kemas-template-controller");
const masterItemBahanKemasTemplateRouter = express.Router();

masterItemBahanKemasTemplateRouter.get(
  "/item-group-template",
  MasterItemBahanKemasTemplateController.fetchItemWithGroupTemplate
);
masterItemBahanKemasTemplateRouter.get(
  "/item-group-template-other",
  MasterItemBahanKemasTemplateController.fetchItemWithGroupTemplateOther
);
masterItemBahanKemasTemplateRouter.get(
  "/export",
  MasterItemBahanKemasTemplateController.downloadExcelExportItemTemplate
);
masterItemBahanKemasTemplateRouter.post(
  "/approve",
  MasterItemBahanKemasTemplateController.masterItemBahanTemplateApprover
);

module.exports = masterItemBahanKemasTemplateRouter;
