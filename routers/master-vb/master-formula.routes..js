const express = require("express");
const masterFormulaRouter = express.Router();
const { authentication, authenticationLoc } = require("../../middlewares/authentication");
const { getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems, getPPI, exportPPI, exportStatusPembuat, getPPIGridData, exportToExcel } = require("../../controllers/master-vb/master-formula.controller");
const { createNewMasterFormulaTemplate, updateMasterFormulaTemplate, preApprove, checkApprovalLevel, deleteMasterFormulaTemplate, approveSPV, approveMGR, getPrintOutData, exportLockBatch } = require("../../controllers/master-vb/master-formula-template.controller");

// get Product
masterFormulaRouter.get("/ppi-desc", getPPIDescription);
masterFormulaRouter.get("/ppi-format", getPPIFormat);
masterFormulaRouter.get("/cb-owner", getOwner);
masterFormulaRouter.get("/product", getProduct);
masterFormulaRouter.get("/status-pembuat", getPPIItems);

masterFormulaRouter.get("/ppi", getPPI);
masterFormulaRouter.get("/ppi-export", exportPPI);
masterFormulaRouter.get("/ppi-formula", authentication, getPPIGridData);
masterFormulaRouter.get("/pembuat-export", exportStatusPembuat);

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


module.exports = masterFormulaRouter