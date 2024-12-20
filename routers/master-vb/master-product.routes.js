const express = require("express");
const masterProductRouter = express.Router();
const MasterProductController = require("../../controllers/master-vb/master-product.controller");

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


module.exports = masterProductRouter