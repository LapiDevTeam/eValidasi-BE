const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ControllerFormulaFix = require("../controllers/controllerFormulaFix");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/create-formulaFix",
  authentication,
  ControllerFormulaFix.createFormulaFix
);

router.get("/all-formula-fix", ControllerFormulaFix.findAllFormulaFix);
router.get(
  "/formula-fix/:id",
  authentication,
  ControllerFormulaFix.getFormulaFixDetails
);
router.put("/update-formulaFix/:id", ControllerFormulaFix.updateFormulaFix);
router.put(
  "/approve-formulaFix/:id",
  authentication,
  ControllerFormulaFix.approveFormulaFix
);

// save dan edit perhitungan bahan baku
router.put(
  "/handle-perhitungan-bahan-baku/:id",
  authentication,
  ControllerFormulaFix.handleSavePerhitunganBahanBaku
);

// save dan edit kemasan formula fix
router.put(
  "/handle-kemasan-formula-fix/:id",
  authentication,
  ControllerFormulaFix.handleSaveKemasanFormulaFix
);

// save dan edit proses pengolahan
router.put(
  "/handle-proses-pengolahan/:id",
  authentication,
  ControllerFormulaFix.handleSaveProsesPengolahan
);
// save dan edit proses pengemasan
router.put(
  "/handle-proses-pengemasan/:id",
  authentication,
  ControllerFormulaFix.handleSaveProsesPengemasan
);
// save dan edit rancangan
router.put(
  "/handle-rancangan-spesifikasi-obat-jadi/:id",
  authentication,
  ControllerFormulaFix.handleSaveRancanganSpesifikasiObatJadi
);

router.post(
  "/upload-data-stabilitas/:id",
  authentication,
  upload.single("image"),
  ControllerFormulaFix.uploadDataStabilitas
);

router.get(
  "/get-upload-data-stabilitas/:id",
  authentication,
  ControllerFormulaFix.getUploadDataStabilitas
);
router.post(
  "/upload-acuan-catatan-trial/:id",
  authentication,
  upload.single("image"),
  ControllerFormulaFix.uploadAcuanCatatanTrial
);

router.get(
  "/get-upload-acuan-catatan-trial/:id",
  authentication,
  ControllerFormulaFix.getUploadAcuanCatatanTrial
);

router.get("/formula-fix-details/:id", ControllerFormulaFix.getFormulaDetails);

router.delete("/delete-formula-fix/:id", ControllerFormulaFix.deleteFormulaFix);

module.exports = router;
