const express = require("express");
const router = express.Router();
const ControllerCatatanTrial = require("../controllers/controllerCatatanTrial");
// const { authentication } = require("../middlewares/authentication");

router.get("/all-namaProduk", ControllerCatatanTrial.findAllNamaProduct);
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
router.delete(
  "/delete-catatan-trial/:id",
  ControllerCatatanTrial.deleteCatatanTrial
);

module.exports = router;
