const express = require("express");
const router = express.Router();
const ControllerProtokolValidasi = require("../controllers/controllerProtokolValidasi");
const { authentication } = require("../middlewares/authentication");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// router.post(
//   "/product-brief",
//   authentication,
//   ControllerProtokolValidasi.createProductBrief
// );
router.post(
  "/upload-pdf",
  upload.single("pdf"),
  authentication,
  ControllerProtokolValidasi.uploadPdf
);
router.get(
  "/all-protokol-validasi",
  ControllerProtokolValidasi.findAllProtokolValidasi
);
router.get(
  "/get-protokol-validasi/:id",
  ControllerProtokolValidasi.getProtokolValidasi
);
router.get(
  "/get-upload-protokol/:id",
  authentication,
  ControllerProtokolValidasi.getUpload
);
router.post(
  "/approve/:id",
  authentication,
  ControllerProtokolValidasi.approveProtokol
);

module.exports = router;
