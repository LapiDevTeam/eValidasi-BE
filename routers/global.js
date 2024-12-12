const express = require("express");
const GlobalController = require("../controllers/global-controller");
const globalRouter = express.Router();

// Fetch Group Code
globalRouter.get("/group-code", GlobalController.fetchGroupCode);

// fetch DPBA
globalRouter.get("/dpba-detail", GlobalController.fetchDPBADetail);

// fetch ITEM UNIT ID
globalRouter.get("/item-unit", GlobalController.fetchItemUnit);

// fetch BPOM ITEM
globalRouter.get("/bpom-item", GlobalController.fetchBpomItem);

module.exports = globalRouter;
