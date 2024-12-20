const express = require("express");
const MasterItemBahanKemasTemplateController = require("../../controllers/master-vb/master-item-bahan-kemas-template-controller");
const { authentication } = require("../../middlewares/authentication");
const masterItemBahanKemasTemplateRouter = express.Router();


masterItemBahanKemasTemplateRouter.get(
  "/export",
  MasterItemBahanKemasTemplateController.downloadExcelExportItemTemplate
);

masterItemBahanKemasTemplateRouter.use(authentication)
masterItemBahanKemasTemplateRouter.get(
  "/item-group-template",
  MasterItemBahanKemasTemplateController.fetchItemWithGroupTemplate
);
masterItemBahanKemasTemplateRouter.get(
  "/item-group-template-other",
  MasterItemBahanKemasTemplateController.fetchItemWithGroupTemplateOther
);
masterItemBahanKemasTemplateRouter.post(
  "/approve",
  MasterItemBahanKemasTemplateController.masterItemBahanTemplateApprover
);

module.exports = masterItemBahanKemasTemplateRouter;
