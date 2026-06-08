'use strict';

const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const {
  getMasterRKTPreview,
  exportMasterRKT,
  requestMasterRKTApproval,
  approveMasterRKT,
  rejectMasterRKT,
} = require('../../controllers/transactions/master-rkt.controller');
const {
  getMasterJadwalBulananPreview,
  saveMasterJadwalBulanan,
  exportMasterJadwalBulanan,
  requestMasterJadwalBulananApproval,
  approveMasterJadwalBulanan,
  rejectMasterJadwalBulanan,
  getMasterJadwalBulananExternalPreview,
  exportMasterJadwalBulananExternal,
} = require('../../controllers/transactions/master-jadwal-bulanan.controller');

// All routes require authentication
router.use(authentication);

// GET /master/rkt/preview?year=2026
router.get('/rkt/preview', getMasterRKTPreview);

// GET /master/rkt/export?year=2026
router.get('/rkt/export', exportMasterRKT);

// POST /master/rkt/request-approve
router.post('/rkt/request-approve', requestMasterRKTApproval);

// POST /master/rkt/approve
router.post('/rkt/approve', approveMasterRKT);

// POST /master/rkt/reject
router.post('/rkt/reject', rejectMasterRKT);

// GET /master/jadwal-bulanan/preview?year=2026&month=5
router.get('/jadwal-bulanan/preview', getMasterJadwalBulananPreview);

// POST /master/jadwal-bulanan/save
router.post('/jadwal-bulanan/save', saveMasterJadwalBulanan);

// POST /master/jadwal-bulanan/export
router.post('/jadwal-bulanan/export', exportMasterJadwalBulanan);

// POST /master/jadwal-bulanan/request-approve
router.post('/jadwal-bulanan/request-approve', requestMasterJadwalBulananApproval);

// POST /master/jadwal-bulanan/approve
router.post('/jadwal-bulanan/approve', approveMasterJadwalBulanan);

// POST /master/jadwal-bulanan/reject
router.post('/jadwal-bulanan/reject', rejectMasterJadwalBulanan);

// GET /master/jadwal-bulanan-external/preview?year=2026&month=5
router.get('/jadwal-bulanan-external/preview', getMasterJadwalBulananExternalPreview);

// POST /master/jadwal-bulanan-external/export
router.post('/jadwal-bulanan-external/export', exportMasterJadwalBulananExternal);

module.exports = router;
