const express = require("express");
const router = express.Router();
const ControllerCatatanTrial = require("../controllers/controllerCatatanTrial");
const { authentication } = require("../middlewares/authentication");

router.get("/all-namaProduk01", ControllerCatatanTrial.findAllNamaProduct01);
router.get("/all-namaProduk02", ControllerCatatanTrial.findAllNamaProduct02);
router.get("/all-catatan-trial", ControllerCatatanTrial.findAllCatatanTrial);
router.post(
  "/create-catatanTrial",
  authentication,
  ControllerCatatanTrial.createCatatanTrial
);
router.put(
  "/update-catatanTrial/:id",
  ControllerCatatanTrial.updateCatatanTrial
);
router.get("/all-namaBahanBaku", ControllerCatatanTrial.findNamaBahanBaku);

// save dan edit komposisi catatan trial
router.put(
  "/handle-komposisi-catatan-trial/:id",
  authentication,
  ControllerCatatanTrial.handleSaveKomposisiCatatanTrial
);

// save dan edit perhitungan zat aktif
router.put(
  "/handle-perhitungan-zat-aktif/:id",
  authentication,
  ControllerCatatanTrial.handleSavePerhitunganZatAktif
);
// save dan edit metode pembuatan
router.put(
  "/handle-metode-pembuatan/:id",
  authentication,
  ControllerCatatanTrial.handleSaveMetodePembuatan
);
// save dan edit pengamatanawal cair
router.put(
  "/handle-pengamatan-awal-cair/:id",
  authentication,
  ControllerCatatanTrial.handleSavePengamatanAwalCair
);
// save dan edit pengamatanawal steril
router.put(
  "/handle-pengamatan-awal-steril/:id",
  authentication,
  ControllerCatatanTrial.handleSavePengamatanAwalSteril
);
// save dan edit pengamatanawal padat
router.put(
  "/handle-pengamatan-awal-padat/:id",
  authentication,
  ControllerCatatanTrial.handleSavePengamatanAwalPadat
);
// save dan edit pengamatanawal penyalutan
router.put(
  "/handle-pengamatan-awal-penyalutan/:id",
  authentication,
  ControllerCatatanTrial.handleSavePengamatanAwalPenyalutan
);

router.put(
  "/approve-pemohon-catatan-trial/:id",
  authentication,
  ControllerCatatanTrial.approvePemohon
);

// formula catatan trial
router.post(
  "/create-formula-catatan-trial",
  authentication,
  ControllerCatatanTrial.createFormulaCatatanTrial
);

router.put(
  "/update-formulaCatatanTrial/:id",
  ControllerCatatanTrial.updateFormulaCatatanTrial
);

// pengamatan awal cair
router.post(
  "/create-pengamatan-awal-cair",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalCair
);

router.put(
  "/update-pengamatanAwalCair/:id",
  ControllerCatatanTrial.updatePengamatanAwalCair
);
// pengamatan awal steril
router.post(
  "/create-pengamatan-awal-steril",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalSteril
);

router.put(
  "/update-pengamatanAwalSteril/:id",
  ControllerCatatanTrial.updatePengamatanAwalSteril
);

// pengamatan awal padat
router.post(
  "/create-pengamatan-awal-padat",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalPadat
);

router.put(
  "/update-pengamatanAwalPadat/:id",
  ControllerCatatanTrial.updatePengamatanAwalPadat
);
// pengamatan awal penyalutan

router.post(
  "/create-pengamatan-awal-penyalutan",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalPenyalutan
);

router.put(
  "/update-pengamatanAwalPenyalutan/:id",
  ControllerCatatanTrial.updatePengamatanAwalPenyalutan
);

// save dan edit proses padat
router.put(
  "/handle-proses-catatan-trial-padat/:id",
  authentication,
  ControllerCatatanTrial.handleSaveProsesCatatanTrialPadat
);
// save dan edit proses penyalutan
router.put(
  "/handle-proses-catatan-trial-penyalutan/:id",
  authentication,
  ControllerCatatanTrial.handleSaveProsesCatatanTrialPenyalutan
);

// pengamatan awal lanjutan
router.post(
  "/create-pengamatan-lanjutan",
  authentication,
  ControllerCatatanTrial.createPengamatanLanjutan
);
router.put(
  "/update-pengamatanAwalLanjutan/:id",
  ControllerCatatanTrial.updatePengamatanAwalLanjutan
);

// pembahasan kesimpulan tindak lanjut perhitungan bahan tambahan
router.put(
  "/update-pembahasan/:CatatanTrialID",
  ControllerCatatanTrial.updatePembahasan
);
router.put(
  "/update-kesimpulan/:CatatanTrialID",
  ControllerCatatanTrial.updateKesimpulan
);
router.put(
  "/update-tindakLanjut/:CatatanTrialID",
  ControllerCatatanTrial.updateTindakLanjut
);
router.put(
  "/update-upload/:CatatanTrialID",
  ControllerCatatanTrial.updateUpload
);
router.put(
  "/update-perhitunganBatasBahanTambahan/:CatatanTrialID",
  ControllerCatatanTrial.updatePerhitunganBatasBahanTambahan
);

router.get(
  "/get-komposisiNamaBahan/:id",
  ControllerCatatanTrial.getKomposisiNamaBahan
);
router.get(
  "/get-bentukSediaanCategoryCair",
  ControllerCatatanTrial.getBentukSediaanCategoryCair
);
router.get(
  "/get-bentukSediaanCategoryPadat",
  ControllerCatatanTrial.getBentukSediaanCategoryPadat
);
router.get(
  "/get-bentukSediaanCategorySteril",
  ControllerCatatanTrial.getBentukSediaanCategorySteril
);
router.get(
  "/get-filter-catatan-trial-padat",
  ControllerCatatanTrial.getFilterCatatanTrialPadat
);

router.get(
  "/catatan-trial/:id",
  authentication,
  ControllerCatatanTrial.getCatatanTrialDetails
);
router.get(
  "/catatan-trial-cair/:id",
  ControllerCatatanTrial.getCatatanTrialCairDetails
);
router.get(
  "/catatan-trial-padat/:id",
  ControllerCatatanTrial.getCatatanTrialPadatDetails
);
router.get(
  "/catatan-trial-steril/:id",
  ControllerCatatanTrial.getCatatanTrialSterilDetails
);
router.get(
  "/catatan-trial-penyalutan/:id",
  ControllerCatatanTrial.getCatatanTrialPenyalutanDetails
);

router.put(
  "/approve-catatanTrial/:id",
  authentication,
  ControllerCatatanTrial.approveCatatanTrial
);

// DELETE CATATAN TRIAL
router.delete(
  "/delete-catatan-trial/:id",
  ControllerCatatanTrial.deleteCatatanTrial
);

router.get(
  "/catatan-trial/history/:id",
  ControllerCatatanTrial.getHistoryCatatanTrial
);

module.exports = router;
