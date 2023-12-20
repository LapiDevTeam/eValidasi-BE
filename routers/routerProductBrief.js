const express = require("express");
const router = express.Router();
const ControllerProductBrief = require("../controllers/controllerProductBrief");

router.post("/product-brief", ControllerProductBrief.createProductBrief);
router.get("/all-sediaans", ControllerProductBrief.findAllSediaan);
router.get("/all-ruang-lingkup", ControllerProductBrief.findAllRuangLingkup);
router.get("/all-product-brief", ControllerProductBrief.findAllProductBrief);
router.get("/product-brief/:id", ControllerProductBrief.getProductBriefDetails);
router.put("/product-brief/:id", ControllerProductBrief.editProductBrief);
router.get("/get-no-product-brief", ControllerProductBrief.getNoProductBrief);
router.delete(
  "/delete-product-brief/:id",
  ControllerProductBrief.deleteProductBrief
);
router.get("/testnodemailer", ControllerProductBrief.nodeMailer);

module.exports = router;
