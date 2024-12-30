const express = require("express");
const masterProductRouter = express.Router();
const MasterProductController = require("../../controllers/master-vb/master-product.controller");
const { authentication } = require("../../middlewares/authentication");

// fetch Product
masterProductRouter.get("/", MasterProductController.fetchProduct);
// fetch bentuk sediaan
masterProductRouter.get("/bentuk-sediaan", MasterProductController.fetchBentukSediaan);
// fetch Ruang Lingkup
masterProductRouter.get("/ruang-lingkup", MasterProductController.fetchRuangLingkup);
// fetch Customer
masterProductRouter.get("/customer", MasterProductController.fetchCustomer);
// fetch Customer
// masterProductRouter.get("/customer", MasterProductController.fetchCustomer);

masterProductRouter.post("/", authentication, MasterProductController.addNewProduct);
masterProductRouter.patch("/", authentication, MasterProductController.updateProduct);
masterProductRouter.get("/maping-itemID", MasterProductController.getMappingID);
masterProductRouter.get("/bahanaktif", MasterProductController.getBahanAktif);
masterProductRouter.get("/lastapprovedate", MasterProductController.getLastApproveDate);

masterProductRouter.post("/approve",authentication, MasterProductController.approveProduct);



module.exports = masterProductRouter