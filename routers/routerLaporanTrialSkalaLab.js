const express = require("express");
const router = express.Router();
const ControllerLaporanTrialSkalaLab = require("../controllers/controllerLaporanTrialSkalaLab");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/laporan-trial-skala-lab",
  authentication,
  ControllerLaporanTrialSkalaLab.createLaporanTrialSkalaLab
);

router.delete(
  "/delete-laporan-trial-skala-lab/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.deleteLaporanTrialSkalaLab
);

router.put(
  "/update-laporan-trial-skala-lab/:id",
  ControllerLaporanTrialSkalaLab.updateLaporanTrialSkalaLab
);

router.post(
  "/aktivitas-dan-waktu-pencapaian",
  ControllerLaporanTrialSkalaLab.createAktivitasDanWaktuPencapaian
);

router.post(
  "/create-kesimpulan-formula",
  ControllerLaporanTrialSkalaLab.createKesimpulanFormula
);
router.put(
  "/edit-kesimpulan-formula/:id",
  ControllerLaporanTrialSkalaLab.editKesimpulanFormula
);

router.post(
  "/create-kesimpulan-proses-terpilih",
  ControllerLaporanTrialSkalaLab.createKesimpulanProsesTerpilih
);
router.put(
  "/edit-kesimpulan-proses-terpilih/:id",
  ControllerLaporanTrialSkalaLab.editKesimpulanProsesTerpilih
);

router.post(
  "/create-ringkasan-hasil-studi-cpp",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCpp
);
router.put(
  "/edit-ringkasan-hasil-studi-cpp/:id",
  ControllerLaporanTrialSkalaLab.editRingkasanHasilStudiCpp
);
router.post(
  "/create-ringkasan-hasil-studi-cma",
  ControllerLaporanTrialSkalaLab.createRingkasanHasilStudiCma
);
router.put(
  "/edit-ringkasan-hasil-studi-cma/:id",
  ControllerLaporanTrialSkalaLab.editRingkasanHasilStudiCma
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
router.put(
  "/edit-update-assessment-bahan-aktif/:id",
  ControllerLaporanTrialSkalaLab.editUpdateAssessmentBahanAktif
);
router.post(
  "/create-update-assessment-bahan-tambahan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentBahanTambahan
);
router.put(
  "/edit-update-assessment-bahan-tambahan/:id",
  ControllerLaporanTrialSkalaLab.editUpdateAssessmentBahanTambahan
);
router.post(
  "/create-update-assessment-kemasan",
  ControllerLaporanTrialSkalaLab.createUpdateAssessmentKemasan
);
router.put(
  "/edit-update-assessment-kemasan/:id",
  ControllerLaporanTrialSkalaLab.editUpdateAssessmentKemasan
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
  authentication,
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
router.put(
  "/approve-laporanTrialSkalaLab/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.approveLaporanTrialSkalaLab
);

router.post(
  "/create-permasalahan",
  authentication,
  ControllerLaporanTrialSkalaLab.createPermasalahan
);

// save dan edit kriteria penerimaan
router.put(
  "/handle-kriteria-penerimaan/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveKriteriaPenerimaan
);

// save dan edit kriteria penerimaan
router.put(
  "/handle-studi-cpp-terhadap-cqa/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveStudiCppTerhadapCqa
);
// save dan edit hasilpengamatan
router.put(
  "/handle-hasil-pengamatan/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveHasilPengamatan
);

router.put(
  "/update-upload-studi/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUpload
);
router.get(
  "/studi-cpp-terhadap-cqa/:id",
  ControllerLaporanTrialSkalaLab.getStudiCppTerhadapCqa
);
// save dan edit bahan aktif cma
router.put(
  "/handle-bahan-aktif-cma/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveBahanAktifCma
);
router.put(
  "/update-upload-bahan-aktif-cma/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadBahanAktifCma
);
// save dan edit bahan tambahan cma
router.put(
  "/handle-bahan-tambahan-cma/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveBahanTambahanCma
);
router.put(
  "/update-upload-bahan-tambahan-cma/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadBahanTambahanCma
);

router.put(
  "/update-upload-aktivitas/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadAktivitas
);

// save dan edit hasil dan pembahasan orientasi
router.put(
  "/handle-hasil-dan-pembahasan-orientasi/:id",
  authentication,
  ControllerLaporanTrialSkalaLab.handleSaveHasilDanPembahasanOrientasi
);

router.put(
  "/update-upload-hasil-dan-pembahasan-orientasi/:LaporanTrialSkalaLabID",
  ControllerLaporanTrialSkalaLab.updateUploadHasilDanPembahasanOrientasi
);

module.exports = router;
