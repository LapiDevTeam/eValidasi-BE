const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const { checkFileSizePublic } = require('../../middlewares/upload.middleware');

const {
  getDaBagianList,
  getDaBagianDetail,
  getDaBagianForExport,
  getPrintData,
  getLabelData,
  getFileName,
  getNextCalibrationDate,
  checkIsApproved,
  checkApproveButton,
  getApprIdentity,
  checkAllowInput,
  getDepartments,
  getBagianList,
  saveDaBagian,
  approveDaBagian,
  rejectDaBagian,
  uploadFileDaBagian,
  downloadFileDaBagian,
  deleteFileDaBagian,
} = require('../../controllers/transactions/sertifikasi-Kalibrasi-Bagian-DA.controller');

// ============================================================
// DA BAGIAN GET ROUTES
// ============================================================

// List all records (sb_Show_Grid)
router.get('/list', authentication, getDaBagianList);

// Detail by QA_ID (grid_Header_Click)
router.get('/detail', authentication, getDaBagianDetail);

// Export to Excel (cmdExcel_Click)
router.get('/export', authentication, getDaBagianForExport);

// Print data for DA document, filtered by bagian (generate_DA_Thermo)
router.get('/print-data', getPrintData);

// Label terkalibrasi data (PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil)
router.get('/label-data', authentication, getLabelData);

// Get file name for a record (sbTampil_FIle_name)
router.get('/file-name', authentication, getFileName);

// Get next calibration date (sb_Isi_Kalibrasi_Selanjutnya)
router.get('/next-calibration', authentication, getNextCalibrationDate);

// Check if record is approved at given approver level (fn_IS_approve)
router.get('/is-approved', authentication, checkIsApproved);

// Check approve/reject button status (sb_approve_button)
router.get('/check-approve-button', authentication, checkApproveButton);

// Get approver identity (fnApprIdentity)
router.get('/approver-identity', authentication, getApprIdentity);

// Check allow input permission (fnIsAllowInput)
router.get('/allow-input', authentication, checkAllowInput);

// Get departments list from m_karyawan (sbIsi_Combo_Dept)
router.get('/departments', authentication, getDepartments);

// Get distinct Bagian list from T_Kalibrasi_DA_Bagian (cmd_print_Click cbo_Bagian fill)
router.get('/bagian-list', authentication, getBagianList);

// Download file from FTP (f_GMP1_Dow_Click)
router.get('/download', authentication, downloadFileDaBagian);

// ============================================================
// DA BAGIAN POST / MUTATION ROUTES
// ============================================================

// Save (Insert or Update) record (cmd_Save_Click)
router.post('/save', authentication, saveDaBagian);

// Approve record (cmd_Approve_Click)
router.post('/approve', authentication, approveDaBagian);

// Reject / un-approve record (cmd_reject_Click)
router.post('/reject', authentication, rejectDaBagian);

// Upload file to FTP (f_GMP1_upl_Click)
router.post('/upload', authentication, checkFileSizePublic, uploadFileDaBagian);

// Delete file reference (f_GMP1_del_Click)
router.post('/delete-file', authentication, deleteFileDaBagian);

module.exports = router;
