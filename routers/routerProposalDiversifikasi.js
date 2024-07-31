const express = require("express");
const router = express.Router();

const ControllerProposalDiversifikasi = require("../controllers/controllerProposalDiversifikasi");
const { authentication } = require("../middlewares/authentication");

router.post(
  "/create-proposal-diversifikasi",
  authentication,
  ControllerProposalDiversifikasi.createProposalDiversifikasi
);
router.get(
  "/all-proposal-diversifikasi",
  ControllerProposalDiversifikasi.findAllProposalDiversifikasi
);

// save dan edit kelengkapan Dokumen
router.put(
  "/handle-kelengkapan-dokumen/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSaveKelengkapanDokumen
);
// save dan edit produk terdampak
router.put(
  "/handle-produk-terdampak/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSaveProdukTerdampak
);
// save dan edit persentase dalam formula
router.put(
  "/handle-persentase-dalam-formula/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSavePersentaseDalamFormula
);
// save dan edit persentase dalam formula
router.put(
  "/handle-pengaruh-pada-performa-proses/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSavePengaruhPadaPerformaProses
);
// save dan edit persentase dalam formula
router.put(
  "/handle-jumlah-bets-per-tahun/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSaveJumlahBetsPerTahun
);
// save dan edit total skoring
router.put(
  "/handle-total-skoring/:id",
  authentication,
  ControllerProposalDiversifikasi.handleSaveTotalSkoring
);
// update proposal diversifikasi
router.put(
  "/update-proposal-diversifikasi/:id",
  authentication,
  ControllerProposalDiversifikasi.updateProposalDiversifikasi
);

router.get(
  "/proposal-diversifikasi/:id",
  authentication,
  ControllerProposalDiversifikasi.getProposalDiversifikasiDetails
);
module.exports = router;
