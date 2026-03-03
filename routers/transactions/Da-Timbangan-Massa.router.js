const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const { checkFileSizePublic } = require('../../middlewares/upload.middleware');

const {
  getDaTimbangaList,
  getDaTimbangaDetail,
  getDaTimbangaForExport,
  getPrintDataDA,
  getPrintDataDAVerifikasi,
  getLabelData,
  getFileName,
  getNextCalibrationDate,
  checkIsApproved,
  checkApproveButton,
  getDepartments,
  getApprIdentity,
  checkAllowInput,
  saveDaTimbangan,
  approveDaTimbangan,
  rejectDaTimbangan,
  uploadFileDaTimbangan,
  downloadFileDaTimbangan,
  deleteFileDaTimbangan,
} = require('../../controllers/transactions/sertifikasi-DA-Timbangan-Massa.controller');

// ============== DA TIMBANGAN MASSA GET ROUTES ==============

// List all records (sb_Show_Grid)
router.get('/list', authentication, getDaTimbangaList);

// Detail by QA_ID (grid_Header_Click)
router.get('/detail', authentication, getDaTimbangaDetail);

// Export to Excel (cmdExcel_Click)
router.get('/export', authentication, getDaTimbangaForExport);

// Print data - DA Kalibrasi document (generate_DA_Thermo)
router.get('/print-data-da', authentication, getPrintDataDA);

// Print data - DA Verifikasi document (generate_DA_Verifikasi)
router.get('/print-data-da-verifikasi', authentication, getPrintDataDAVerifikasi);

// Label terkalibrasi data (PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil)
router.get('/label-data', authentication, getLabelData);

// Get file name for a record (sbTampil_FIle_name)
router.get('/file-name', authentication, getFileName);

// Get next calibration date (sb_Isi_Kalibrasi_Selanjutnya)
router.get('/next-calibration', authentication, getNextCalibrationDate);

// Check if record is approved (fn_IS_approve)
router.get('/is-approved', authentication, checkIsApproved);

// Check approve/reject button status (sb_approve_button)
router.get('/check-approve-button', authentication, checkApproveButton);

// Get departments list (sbIsi_Combo_Dept)
router.get('/departments', authentication, getDepartments);

// Get approver identity (fnApprIdentity)
router.get('/approver-identity', authentication, getApprIdentity);

// Check allow input (fnIsAllowInput)
router.get('/allow-input', authentication, checkAllowInput);

// Download file from FTP (f_GMP1_Dow_Click)
router.get('/download', authentication, downloadFileDaTimbangan);

// ============== DA TIMBANGAN MASSA POST / MUTATION ROUTES ==============

// Save (Insert or Update) record (cmd_Save_Click)
router.post('/save', authentication, saveDaTimbangan);

// Approve record (cmd_Approve_Click)
router.post('/approve', authentication, approveDaTimbangan);

// Reject record (cmd_reject_Click)
router.post('/reject', authentication, rejectDaTimbangan);

// Upload file to FTP (f_GMP1_upl_Click)
router.post('/upload', authentication, checkFileSizePublic, uploadFileDaTimbangan);

// Delete file reference (f_GMP1_del_Click)
router.post('/delete-file', authentication, deleteFileDaTimbangan);

module.exports = router;
