const express = require("express");
const router = express.Router();
const { checkFileSizePublicV2, uploadPublicV2, getFileV2 } = require("../../controllers/v2/upload.controller");
const { createHasilPengamatan } = require("../../controllers/controllerCatatanTrial");



router.post(
  "/upload-hasil-pengamatan",
  checkFileSizePublicV2,
  uploadPublicV2,
  createHasilPengamatan
);
router.get(
  "/getfile-hasil-pengamatan",
  getFileV2
);

module.exports = router;
