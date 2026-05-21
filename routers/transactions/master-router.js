'use strict';

const express = require('express');
const router = express.Router();
const { authentication } = require('../../middlewares/authentication');
const { getMasterRKTPreview, exportMasterRKT } = require('../../controllers/transactions/master-rkt.controller');
const {
  getMasterJadwalBulananPreview,
  exportMasterJadwalBulanan,
  getMasterJadwalBulananExternalPreview,
  exportMasterJadwalBulananExternal,
} = require('../../controllers/transactions/master-jadwal-bulanan.controller');

// All routes require authentication
router.use(authentication);

// GET /master/rkt/preview?year=2026
router.get('/rkt/preview', getMasterRKTPreview);

// GET /master/rkt/export?year=2026
router.get('/rkt/export', exportMasterRKT);

// GET /master/jadwal-bulanan/preview?year=2026&month=5
router.get('/jadwal-bulanan/preview', getMasterJadwalBulananPreview);

// POST /master/jadwal-bulanan/export
router.post('/jadwal-bulanan/export', exportMasterJadwalBulanan);

// GET /master/jadwal-bulanan-external/preview?year=2026&month=5
router.get('/jadwal-bulanan-external/preview', getMasterJadwalBulananExternalPreview);

// POST /master/jadwal-bulanan-external/export
router.post('/jadwal-bulanan-external/export', exportMasterJadwalBulananExternal);

module.exports = router;
