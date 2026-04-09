const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');

const {
  getPenghapusanList,
  getPenghapusanDetail,
  getPenghapusanDetailItems,
  getCurrentApprove,
  checkApproveButton,
  browseDaInstruments,
  getApproverIdentityPenghapusan,
  savePenghapusan,
  saveDetailPenghapusan,
  deletePenghapusan,
  deleteDetailPenghapusan,
  approvePenghapusan,
  getPenghapusanPrintData,
} = require('../../controllers/transactions/penghapusan-alat.controller');

// ============== GET ROUTES ==============

// List all penghapusan alat records for a given year/department (sb_Show_Grid_head)
router.get('/list', authentication, getPenghapusanList);

// Get penghapusan alat header detail by no_penghapusan (grid_Head_DblClick)
router.get('/detail', authentication, getPenghapusanDetail);

// Get penghapusan alat instrument items by no_penghapusan (sb_Show_Grid_Detail)
router.get('/detail-items', authentication, getPenghapusanDetailItems);

// Get current approval level for a penghapusan (fnCurrApprove)
router.get('/current-approve', authentication, getCurrentApprove);

// Check whether current user can approve and whether print is enabled (sbCheck_Button_Approve)
router.get('/check-approve-button', authentication, checkApproveButton);

// Browse DA instruments available for deletion (cmd_browse_DA_Click)
router.get('/browse-da', authentication, browseDaInstruments);

// Get print datasets for Penghapusan form (generate_Print)
router.get('/print-data', getPenghapusanPrintData);

// Get approver identity for KAL_Penghapusan (fnApprIdentity)
router.get('/approver-identity', authentication, getApproverIdentityPenghapusan);

// ============== POST / DELETE ROUTES ==============

// Create new penghapusan alat header (cmd_Save_Click – INSERT only)
router.post('/save', authentication, savePenghapusan);

// Insert or update a penghapusan detail item (cmd_SaveDetail_Click)
router.post('/save-detail', authentication, saveDetailPenghapusan);

// Delete entire penghapusan header + detail (cmd_Del_Click)
router.delete('/delete', authentication, deletePenghapusan);

// Delete a single penghapusan detail item (cmd_del_detail_Click)
router.delete('/delete-detail', authentication, deleteDetailPenghapusan);

// Approve penghapusan; at level 2 also physically purges DA records (cmd_Approve_Click)
router.post('/approve', authentication, approvePenghapusan);

module.exports = router;
