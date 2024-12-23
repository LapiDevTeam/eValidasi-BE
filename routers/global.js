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

// fetch Principle
globalRouter.get("/principle", GlobalController.fetchPrinciple);

// fetch Negara asal
globalRouter.get("/negara-asal", GlobalController.fetchNegaraAsal);

// fetch supplier
globalRouter.get("/supplier", GlobalController.fetchSupplier);

module.exports = globalRouter;
