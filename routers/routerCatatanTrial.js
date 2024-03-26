const express = require("express");
const router = express.Router();
const ControllerCatatanTrial = require("../controllers/controllerCatatanTrial");
// const { authentication } = require("../middlewares/authentication");

router.get("/all-namaProduk01", ControllerCatatanTrial.findAllNamaProduct01);
router.get("/all-namaProduk02", ControllerCatatanTrial.findAllNamaProduct02);
router.get("/all-catatan-trial", ControllerCatatanTrial.findAllCatatanTrial);
router.post("/create-catatanTrial", ControllerCatatanTrial.createCatatanTrial);
router.get("/all-namaBahanBaku", ControllerCatatanTrial.findNamaBahanBaku);
router.post(
  "/create-komposisi-catatanTrial",
  ControllerCatatanTrial.createKomposisiCatatanTrial
);
router.post(
  "/create-perhitungan-zatAktif",
  ControllerCatatanTrial.createPerhitunganZatAktif
);
router.post(
  "/create-metode-pembuatan",
  ControllerCatatanTrial.createMetodePembuatan
);
router.post(
  "/create-proses-catatan-trial-padat",
  ControllerCatatanTrial.createProsesCatatanTrialPadat
);
router.post(
  "/create-proses-catatan-trial-penyalutan",
  ControllerCatatanTrial.createProsesCatatanTrialPenyalutan
);
router.post(
  "/create-formula-catatan-trial",
  ControllerCatatanTrial.createFormulaCatatanTrial
);
router.post(
  "/create-pengamatan-awal-cair",
  ControllerCatatanTrial.createPengamatanAwalCair
);
router.post(
  "/create-pengamatan-awal-steril",
  ControllerCatatanTrial.createPengamatanAwalSteril
);
router.post(
  "/create-pengamatan-awal-padat",
  ControllerCatatanTrial.createPengamatanAwalPadat
);
router.post(
  "/create-pengamatan-awal-penyalutan",
  ControllerCatatanTrial.createPengamatanAwalPenyalutan
);
router.post(
  "/create-pengamatan-lanjutan",
  ControllerCatatanTrial.createPengamatanLanjutan
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
  "/get-filter-catatan-trial-padat",
  ControllerCatatanTrial.getFilterCatatanTrialPadat
);

router.get("/catatan-trial/:id", ControllerCatatanTrial.getCatatanTrialDetails);
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

module.exports = router;
