const express = require("express");
const router = express.Router();
const ControllerProductBrief = require("../controllers/controllerProductBrief");
const { authentication } = require("../middlewares/authentication");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post(
  "/product-brief",
  authentication,
  upload.single("image"),
  ControllerProductBrief.createProductBrief
);
router.get("/all-sediaans", ControllerProductBrief.findAllSediaan);
router.get("/all-ruang-lingkup", ControllerProductBrief.findAllRuangLingkup);
router.get("/all-product-brief", ControllerProductBrief.findAllProductBrief);
router.get(
  "/product-brief/:id",
  authentication,
  ControllerProductBrief.getProductBriefDetails
);
router.get(
  "/product-brief/history/:id",
  ControllerProductBrief.getHistoryProductBrief
);
router.put("/product-brief/:id", ControllerProductBrief.editProductBrief);
router.put(
  "/update-status/:ProductBriefID",
  ControllerProductBrief.updateStatus
);
router.get("/get-no-product-brief", ControllerProductBrief.getNoProductBrief);
router.delete(
  "/delete-product-brief/:id",
  ControllerProductBrief.deleteProductBrief
);
router.get("/testnodemailer", ControllerProductBrief.nodeMailer);
router.put(
  "/approve-product-brief/:id",
  authentication,
  ControllerProductBrief.approveProductBrief
);

module.exports = router;
