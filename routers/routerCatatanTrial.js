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

// save dan edit proses padat
router.put(
  "/handle-proses-catatan-trial-padat/:id",
  authentication,
  ControllerCatatanTrial.handleSaveProsesCatatanTrialPadat
);
// save dan edit proses padat
router.put(
  "/handle-proses-catatan-trial-penyalutan/:id",
  authentication,
  ControllerCatatanTrial.handleSaveProsesCatatanTrialPenyalutan
);

// router.post(
//   "/create-komposisi-catatanTrial",
//   authentication,
//   ControllerCatatanTrial.createKomposisiCatatanTrial
// );
// router.post(
//   "/create-perhitungan-zatAktif",
//   authentication,
//   ControllerCatatanTrial.createPerhitunganZatAktif
// );
// router.post(
//   "/create-metode-pembuatan",
//   authentication,
//   ControllerCatatanTrial.createMetodePembuatan
// );
// router.post(
//   "/create-proses-catatan-trial-padat",
//   authentication,
//   ControllerCatatanTrial.createProsesCatatanTrialPadat
// );
// router.post(
//   "/create-proses-catatan-trial-penyalutan",
//   authentication,
//   ControllerCatatanTrial.createProsesCatatanTrialPenyalutan
// );

router.post(
  "/create-pengamatan-awal-steril",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalSteril
);

router.post(
  "/create-pengamatan-awal-penyalutan",
  authentication,
  ControllerCatatanTrial.createPengamatanAwalPenyalutan
);
router.post(
  "/create-pengamatan-lanjutan",
  authentication,
  ControllerCatatanTrial.createPengamatanLanjutan
);
router.put(
  "/update-catatanTrial/:id",
  ControllerCatatanTrial.updateCatatanTrial
);
// router.put(
//   "/update-komposisiCatatanTrial/:id",
//   ControllerCatatanTrial.updateKomposisiCatatanTrial
// );
// router.put(
//   "/update-perhitunganZatAktif/:id",
//   ControllerCatatanTrial.updatePerhitunganZatAktif
// );

router.put(
  "/update-metodePembuatan/:id",
  ControllerCatatanTrial.updateMetodePembuatan
);

router.put(
  "/update-pengamatanAwalSteril/:id",
  ControllerCatatanTrial.updatePengamatanAwalSteril
);
router.put(
  "/update-pengamatanAwalLanjutan/:id",
  ControllerCatatanTrial.updatePengamatanAwalLanjutan
);
router.put(
  "/update-prosesCatatanTrialPadat/:id",
  ControllerCatatanTrial.updateProsesCatatanTrialPadat
);
router.put(
  "/update-perhitunganBatasBahanTambahan/:CatatanTrialID",
  ControllerCatatanTrial.updatePerhitunganBatasBahanTambahan
);
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

router.delete(
  "/delete-catatan-trial/:id",
  ControllerCatatanTrial.deleteCatatanTrial
);
router.delete(
  "/delete-prosesCatatanTrialPadat/:id",
  ControllerCatatanTrial.deleteProsesCatatanTrialPadat
);
router.delete(
  "/delete-komposisiCatatanTrial/:id",
  ControllerCatatanTrial.deleteKomposisiCatatanTrial
);
router.delete(
  "/delete-formulaCatatanTrial/:id",
  ControllerCatatanTrial.deleteFormulaCatatanTrial
);
router.delete(
  "/delete-metodePembuatan/:id",
  ControllerCatatanTrial.deleteMetodePembuatan
);
router.delete(
  "/delete-pengamatanAwalPadat/:id",
  ControllerCatatanTrial.deletePengamatanAwalPadat
);
router.delete(
  "/delete-pengamatanLanjutan/:id",
  ControllerCatatanTrial.deletePengamatanLanjutan
);
router.delete(
  "/delete-prosesPenyalutan/:id",
  ControllerCatatanTrial.deleteProsesPenyalutan
);
router.delete(
  "/delete-pengamatanAwalPenyalutan/:id",
  ControllerCatatanTrial.deletePengamatanAwalPenyalutan
);
router.put(
  "/approve-catatanTrial/:id",
  authentication,
  ControllerCatatanTrial.approveCatatanTrial
);

module.exports = router;
