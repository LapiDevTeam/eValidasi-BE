const express = require("express");
const router = express.Router();
const { checkFileSizePublicV2, uploadPublicV2, getFileV2 } = require("../../controllers/v2/upload.controller");
const { createHasilPengamatan, getAllHasilPengamatan, updateHasilPengamatan } = require("../../controllers/controllerCatatanTrial");



router.post(
  "/upload-hasil-pengamatan",
  checkFileSizePublicV2,
  uploadPublicV2,
  createHasilPengamatan
);

router.get(
  "/get-hasil-pengamatan",
  getAllHasilPengamatan
);

router.patch(
  "/hasil-pengamatan",
  updateHasilPengamatan
);

router.get(
  "/getfile-hasil-pengamatan",
  getFileV2
);

module.exports = router;
