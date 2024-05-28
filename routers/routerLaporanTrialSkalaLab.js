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
router.put(
  "/edit-aktivitas-dan-waktu-pencapaian/:id",
  ControllerLaporanTrialSkalaLab.editAktivitasDanWaktuPencapaian
);
router.put(
  "/edit-kesimpulan-formula-terpilih/:id",
  ControllerLaporanTrialSkalaLab.editKesimpulanFormulaTerpilih
);

router.delete(
  "/delete-kesimpulan-formula-terpilih/:id",
  ControllerLaporanTrialSkalaLab.deleteKesimpulanFormulaTerpilih
);
router.delete(
  "/delete-bahan-aktif/:id",
  ControllerLaporanTrialSkalaLab.deleteBahanAktif
);
router.delete(
  "/delete-bahan-tambahan/:id",
  ControllerLaporanTrialSkalaLab.deleteBahanTambahan
);
router.delete(
  "/delete-bahan-Kemasan/:id",
  ControllerLaporanTrialSkalaLab.deleteBahanKemasan
);
router.delete(
  "/delete-ringkasan-cpp/:id",
  ControllerLaporanTrialSkalaLab.deleteRingkasanCpp
);
router.delete(
  "/delete-kesimpulan-proses/:id",
  ControllerLaporanTrialSkalaLab.deleteKesimpulanProses
);
router.delete(
  "/delete-update-risk/:id",
  ControllerLaporanTrialSkalaLab.deleteUpdateRisk
);
router.delete(
  "/delete-usulan/:id",
  ControllerLaporanTrialSkalaLab.deleteUsulan
);
router.put("/edit-usulan/:id", ControllerLaporanTrialSkalaLab.editUsulan);

module.exports = router;
