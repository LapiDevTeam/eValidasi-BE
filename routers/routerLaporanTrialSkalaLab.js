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
  "/create-ringkasan-hasil-studi-cma",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCma
);
router.post(
  "/create-kesimpulan-proses-terpilih",
  ControllerLaporanTrialSkalaLab.createKesimpulanProsesTerpilih
);
router.post(
  "/create-usulan-penelitian-produk",
  ControllerLaporanTrialSkalaLab.createUsulanPenelitianProduk
);
router.post(
  "/create-update-assessment",
  ControllerLaporanTrialSkalaLab.createUpdateAssessment
);
router.post(
  "/create-update-assessment-bahan-aktif",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentBahanAktif
);
router.post(
  "/create-update-assessment-bahan-tambahan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentBahanTambahan
);
router.post(
  "/create-update-assessment-kemasan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentKemasan
);

router.delete(
  "/delete-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.deleteLaporanTrialSkalaLab
);

router.get(
  "/all-laporan-trial-skala-lab",
  ControllerLaporanTrialSkalaLab.findAllLaporanTrialSkalaLab
);
router.get(
  "/laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.getLaporanTrialSkalaLabDetails
);

router.put(
  "/update-dokumenacuan-laporan/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateDokumenAcuanLaporan
);

router.put(
  "/edit-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.editLaporanTrialSkalaLab
);

router.put("/edit-usulan/:id", ControllerLaporanTrialSkalaLab.editUsulan);

module.exports = router;
