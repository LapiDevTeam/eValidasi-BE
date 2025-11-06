const express = require("express");
const masterFormulaRouter = express.Router();
const { authentication, authenticationLoc } = require("../../middlewares/authentication");
const { getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems, getPPI, exportPPI, exportStatusPembuat, getPPIGridData, exportToExcel } = require("../../controllers/master-vb/master-formula.controller");
const { createNewMasterFormulaTemplate, updateMasterFormulaTemplate, preApprove, checkApprovalLevel, deleteMasterFormulaTemplate, approveSPV, approveMGR, getPrintOutData, exportLockBatch, createKeteranganApprove, editKeteranganApprove, getLvwApprove, getListMergerPPI, createListMergerPPI, deleteKeteranganApprovePPI, refreshListMergerPPI, deleteMergerPPI, updateItemPRC, enableGrid, sbApprButton } = require("../../controllers/master-vb/master-formula-template.controller");
const MasterFormulaItemGroupTemplateController = require("../../controllers/master-vb/master-formula-item-group-template");

// get Product
masterFormulaRouter.get("/ppi-desc", getPPIDescription);
masterFormulaRouter.get("/ppi-format", getPPIFormat);
masterFormulaRouter.get("/cb-owner", getOwner);
masterFormulaRouter.get("/product", getProduct);
masterFormulaRouter.get("/status-pembuat", getPPIItems);

masterFormulaRouter.get("/ppi", getPPI);
masterFormulaRouter.get("/ppi-export", exportPPI);
masterFormulaRouter.get("/ppi-formula", authentication, getPPIGridData);
masterFormulaRouter.get("/ppi-formula-template", authentication, enableGrid);
masterFormulaRouter.get("/pembuat-export", exportStatusPembuat);
masterFormulaRouter.patch("/pembuat-edit", authentication, updateItemPRC );

// template
masterFormulaRouter.post("/create-template", authentication, createNewMasterFormulaTemplate);
masterFormulaRouter.patch("/update-template", authentication, updateMasterFormulaTemplate);
masterFormulaRouter.delete("/delete-template", authentication, deleteMasterFormulaTemplate);
masterFormulaRouter.post("/checkapprove", authentication, preApprove);
masterFormulaRouter.get("/ceklevelapprover", authentication, checkApprovalLevel);
masterFormulaRouter.post("/approveSPV", authentication, approveSPV);
masterFormulaRouter.post("/approve", authentication, approveMGR);
masterFormulaRouter.get("/print", authentication, getPrintOutData);
masterFormulaRouter.get("/export", exportToExcel);
masterFormulaRouter.get("/pembuat-export-template", exportStatusPembuat);
masterFormulaRouter.get("/lockbatch-export", exportLockBatch);

masterFormulaRouter.get("/sbApprove", authentication, sbApprButton);

//keterangan approve
masterFormulaRouter.get("/ket-approve", getLvwApprove);
masterFormulaRouter.post("/ket-approve-new", authentication, createKeteranganApprove);
masterFormulaRouter.post("/ket-approve-edit", authentication, editKeteranganApprove);
masterFormulaRouter.delete("/ket-approve", authentication, deleteKeteranganApprovePPI);


//merger ppi
masterFormulaRouter.get("/get-list-merger-ppi", getListMergerPPI);
masterFormulaRouter.get("/refresh-list-merger-ppi", refreshListMergerPPI);
masterFormulaRouter.post("/merger-ppi", authentication, createListMergerPPI);
masterFormulaRouter.delete("/merger-ppi", authentication, deleteMergerPPI);

// query item (item group template)
masterFormulaRouter.get("/query-item", authentication, MasterFormulaItemGroupTemplateController.getQueryItem);


module.exports = masterFormulaRouter