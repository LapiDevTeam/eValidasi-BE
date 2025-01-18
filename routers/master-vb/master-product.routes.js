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
masterProductRouter.delete("/", authentication, MasterProductController.deleteProduct);
masterProductRouter.get("/maping-itemID", MasterProductController.getMappingID);
masterProductRouter.get("/bahanaktif", MasterProductController.getBahanAktif);
masterProductRouter.post("/bahanaktif", authentication, MasterProductController.createBahanAktifByProductID);
masterProductRouter.patch("/bahanaktif", authentication, MasterProductController.updateBahanAktifByProductID);
masterProductRouter.delete("/bahanaktif", authentication, MasterProductController.deleteBahanAktifByProductID);
masterProductRouter.get("/lastapprovedate", MasterProductController.getLastApproveDate);
masterProductRouter.get("/print", MasterProductController.generateDAProduk);
masterProductRouter.get("/print-getlink",authentication, MasterProductController.getGeneratedLink);

masterProductRouter.post("/approve",authentication, MasterProductController.approveProduct);
masterProductRouter.get("/getcdobstatus", MasterProductController.getCDOBstatus);



module.exports = masterProductRouter