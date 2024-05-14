const express = require("express");
const router = express.Router();
const ControllerLaporanTrialSkalaLab = require("../controllers/controllerLaporanTrialSkalaLab");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/laporan-trial-skala-lab",
  ControllerLaporanTrialSkalaLab.createLaporanTrialSkalaLab
);
router.post(
  "/aktivitas-dan-waktu-pencapaian",
  ControllerLaporanTrialSkalaLab.createAktivitasDanWaktuPencapaian
);

router.post(
  "/create-kesimpulan-formula",
  ControllerLaporanTrialSkalaLab.createKesimpulanFormula
);
router.post(
  "/create-ringkasan-hasil-studi-cpp",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCpp
);
router.post(
  "/create-kesimpulan-proses-terpilih",
  ControllerLaporanTrialSkalaLab.createKesimpulanProsesTerpilih
);
router.post(
  "/create-usulan-penelitian-produk",
  ControllerLaporanTrialSkalaLab.createUsulanPenelitianProduk
);

router.delete(
  "/delete-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.deleteLaporanTrialSkalaLab
);

router.get(
  "/all-laporan-trial-skala-lab",
  ControllerLaporanTrialSkalaLab.findAllLaporanTrialSkalaLab
);

router.put(
  "/update-dokumenacuan-laporan/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateDokumenAcuanLaporan
);

module.exports = router;
