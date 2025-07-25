const express = require("express");
const router = express.Router();

const ControllerAuditTrail = require("../controllers/controllerAuditTrail");
const { authentication } = require("../middlewares/authentication");

router.get(
  "/download-product-brief",
  ControllerAuditTrail.downloadExcelAuditProductBriefHist
);
router.get(
  "/download-product-brief-status",
  ControllerAuditTrail.downloadExcelAuditProductBriefStatusHist
);
router.get(
  "/download-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditCatatanTrialHist
);
router.get(
  "/download-catatan-trial-status",
  ControllerAuditTrail.downloadExcelAuditCatatanTrialStatusHist
);
router.get(
  "/download-komposisi-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditKomposisiCatatanTrialHist
);
router.get(
  "/download-perhitungan-zat-aktif-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPerhitunganZatAktifHist
);
router.get(
  "/download-formula-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditFormulaCatatanTrialHist
);
router.get(
  "/download-metode-pembuatan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditMetodePembuatanHist
);
router.get(
  "/download-pengamatan-awal-cair-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalCairHist
);
router.get(
  "/download-pengamatan-awal-padat-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalPadatHist
);
router.get(
  "/download-pengamatan-awal-steril-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalSterilHist
);
router.get(
  "/download-pengamatan-awal-penyalutan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalPenyalutanHist
);
router.get(
  "/download-pengamatan-lanjutan-catatan-trial",
  ControllerAuditTrail.downloadExcelAuditPengamatanAwalLanjutanHist
);
router.get(
  "/download-proses-catatan-trial-padat",
  ControllerAuditTrail.downloadExcelAuditProsesCatatanTrialPadatHist
);
router.get(
  "/download-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditStudiPraformulasiHist
);
router.get(
  "/download-studi-praformulasi-status",
  ControllerAuditTrail.downloadExcelAuditStudiPraformulasiStatusHist
);
router.get(
  "/download-deskripsi-product-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditDeskripsiProductHist
);
router.get(
  "/download-farmakologi-klinis-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditFarmakologiKlinisHist
);
router.get(
  "/download-formula-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditFormulaHist
);
router.get(
  "/download-kemasan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKemasanHist
);
router.get(
  "/download-stabilita-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditStabilitaHist
);
router.get(
  "/download-karakteristik-fisikakimia-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKarakteristikFisikaKimiaHist
);
router.get(
  "/download-karakteristik-bahanAktif-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKarakteristikBahanAktifHist
);
router.get(
  "/download-karakteristik-bahanTambahan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKarakteristikBahanTambahanHist
);
router.get(
  "/download-karakteristik-bahanKemasan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKarakteristikBahanKemasanHist
);
router.get(
  "/download-studi-paten-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditStudiPatenHist
);
router.get(
  "/download-matrix-perbandingan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditMatrixPerbandinganHist
);
router.get(
  "/download-uji-inkompatibilitas-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditUjiInkompatibilitasHist
);
router.get(
  "/download-qtpp-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditQtppHist
);
router.get(
  "/download-cqa-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditCqaHist
);
router.get(
  "/download-formula-protokol-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditFormulaProtokolHist
);
router.get(
  "/download-proses-pembuatan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditProsesPembuatanHist
);
router.get(
  "/download-kemasan-protokol-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKemasanProtokolHist
);
router.get(
  "/download-zatAktif-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditZatAktifHist
);
router.get(
  "/download-bahanTambahan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditBahanTambahanHist
);
router.get(
  "/download-kemasanPrimer-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKemasanPrimerHist
);
router.get(
  "/download-mapping-process-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditMappingProcessHist
);
router.get(
  "/download-cpp-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditCppHist
);
router.get(
  "/download-rencana-aktivitas-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditRencanaAktivitasHist
);
router.get(
  "/download-material-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditMaterialHist
);
router.get(
  "/download-originator-kompetitor-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditOriginatorKompetitorHist
);
router.get(
  "/download-kebutuhan-peralatan-studi-praformulasi",
  ControllerAuditTrail.downloadExcelAuditKebutuhanPeralatanHist
);

router.get(
  "/download-formula-fix",
  ControllerAuditTrail.downloadExcelAuditFormulaFixHist
);

router.get(
  "/download-formula-fix-status",
  ControllerAuditTrail.downloadExcelFormulaFixStatusHist
);

router.get(
  "/download-perhitungan-bahan-baku-formula-fix",
  ControllerAuditTrail.downloadExcelPerhitunganBahanBakuFormulaFixHist
);

router.get(
  "/download-kemasan-formula-fix",
  ControllerAuditTrail.downloadExcelKemasanFormulaFixHist
);

router.get(
  "/download-proses-pengolahan",
  ControllerAuditTrail.downloadExcelProsesPengolahanFormulaFixHist
);

router.get(
  "/download-proses-pengemasan",
  ControllerAuditTrail.downloadExcelProsesPengemasanFormulaFixHist
);

router.get(
  "/download-rancangan-spesifikasi-obat-jadi",
  ControllerAuditTrail.downloadExcelRancanganSpesifikasiObatJadiFormulaFixHist
);

router.get(
  "/download-data-stabilitas",
  ControllerAuditTrail.downloadExcelDataStabilitasFormulaFixHist
);

router.get(
  "/download-acuan-catatan-trial",
  ControllerAuditTrail.downloadExcelAcuanCatatanTrialFormulaFixHist
);

router.get(
  "/download-ExcelKelengkapanDokumenHist",
  ControllerAuditTrail.downloadExcelKelengkapanDokumenHist
);

router.get(
  "/download-ExcelProdukTerdampakHist",
  ControllerAuditTrail.downloadExcelProdukTerdampakHist
);

router.get(
  "/download-ExcelProposalDiversifikasiHist",
  ControllerAuditTrail.downloadExcelProposalDiversifikasiHist
);

router.get(
  "/download-PersentaseDalamFormulaHist",
  ControllerAuditTrail.downloadExcelPersentaseDalamFormulaHist
);

router.get(
  "/download-ExcelJumlahBetsPerTahunHist",
  ControllerAuditTrail.downloadExcelJumlahBetsPerTahunHist
);

router.get(
  "/download-ExcelTotalSkoringHist",
  ControllerAuditTrail.downloadExcelTotalSkoringHist
);

router.get(
  "/download-ExcelTimelineTrialHist",
  ControllerAuditTrail.downloadExcelTimelineTrialHist
);

router.get(
  "/download-ExcelProposalDiversifikasiStatusHist",
  ControllerAuditTrail.downloadExcelProposalDiversifikasiStatusHist
);

router.get(
  "/download-ExcelPengaruhPadaPerformaProsesHist",
  ControllerAuditTrail.downloadExcelPengaruhPadaPerformaProsesHist
);

router.get(
  "/download-ExcelProtokolValidasiHist",
  ControllerAuditTrail.downloadExcelProtokolValidasiHist
);

router.get(
  "/download-ExcelAktivitasDanWaktuPencapaianHist",
  ControllerAuditTrail.downloadExcelAktivitasDanWaktuPencapaianHist
);

router.get(
  "/download-ExcelRingkasanHasilStudiCppHist",
  ControllerAuditTrail.downloadExcelRingkasanHasilStudiCppHist
);

router.get(
  "/download-ExcelKesimpulanProsesTerpilihHist",
  ControllerAuditTrail.downloadExcelKesimpulanProsesTerpilihHist
);

router.get(
  "/download-ExcelUsulanPenelitianProdukHist",
  ControllerAuditTrail.downloadExcelUsulanPenelitianProdukHist
);

router.get(
  "/download-ExcelUpdateRiskAssessmentHist",
  ControllerAuditTrail.downloadExcelUpdateRiskAssessmentHist
);

router.get(
  "/download-ExcelUpdateRiskAssessmentBahanAktifHist",
  ControllerAuditTrail.downloadExcelUpdateRiskAssessmentBahanAktifHist
);

router.get(
  "/download-ExcelUpdateRiskAssessmentBahanTambahanHist",
  ControllerAuditTrail.downloadExcelUpdateRiskAssessmentBahanTambahanHist
);

router.get(
  "/download-ExcelUpdateRiskAssessmentKemasanHist",
  ControllerAuditTrail.downloadExcelUpdateRiskAssessmentKemasanHist
);

router.get(
  "/download-ExcelRingkasanHasilStudiCmaHist",
  ControllerAuditTrail.downloadExcelRingkasanHasilStudiCmaHist
);

router.get(
  "/download-ExcelLaporanTrialSkalaLabHist",
  ControllerAuditTrail.downloadExcelLaporanTrialSkalaLabHist
);
router.get(
  "/download-ExcelLaporanTrialSkalaLabStatusHist",
  ControllerAuditTrail.downloadExcelLaporanTrialSkalaLabStatusHist
);

router.get(
  "/download-ExcelLTSStudiScreeningSourceApiHist",
  ControllerAuditTrail.downloadExcelLTSStudiScreeningSourceApiHist
);

router.get(
  "/download-ExcelLTSKriteriaPenerimaanHist",
  ControllerAuditTrail.downloadExcelLTSKriteriaPenerimaanHist
);

router.get(
  "/download-ExcelLTSStudiCppTerhadapCqaHist",
  ControllerAuditTrail.downloadExcelLTSStudiCppTerhadapCqaHist
);

router.get(
  "/download-ExcelLTSBahanAktifCmaHist",
  ControllerAuditTrail.downloadExcelLTSBahanAktifCmaHist
);

router.get(
  "/download-ExcelLTSBahanTambahanCmaHist",
  ControllerAuditTrail.downloadExcelLTSBahanTambahanCmaHist
);

router.get(
  "/download-ExcelLTSBahanTambahanCmaHist",
  ControllerAuditTrail.downloadExcelLTSBahanTambahanCmaHist
);

router.get(
  "/download-ExcelLTSHasilDanPembahasanOrientasiHist",
  ControllerAuditTrail.downloadExcelLTSHasilDanPembahasanOrientasiHist
);

module.exports = router;
