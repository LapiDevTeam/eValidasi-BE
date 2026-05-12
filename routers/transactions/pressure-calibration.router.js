'use strict';

/**
 * pressure-calibration.router.js
 *
 * All routes for the pressure calibration module.
 * Mounted at: /pressure-calibration  (see routers/index.js)
 *
 * TODO: Uncomment `router.use(authentication)` to protect routes once
 *       authentication middleware has been verified for this module.
 */

const express = require('express');
const router  = express.Router();

// const { authentication } = require('../../middlewares/authentication');
// router.use(authentication);

const ctrl = require('../../controllers/transactions/pressure-calibration.controller');

// ── Instruments (read-only) ──────────────────────────────────────────────────
// GET  /api/pressure-calibration/instruments          – List instruments
// GET  /api/pressure-calibration/instruments/:id      – Get one instrument
router.get('/instruments',     ctrl.listInstruments);
router.get('/instruments/:id', ctrl.getInstrument);

// ── Calibration Standards ────────────────────────────────────────────────────
// GET  /api/pressure-calibration/standards            – List standards
// POST /api/pressure-calibration/standards            – Create standard
// GET  /api/pressure-calibration/standards/:id        – Get standard detail
// GET  /api/pressure-calibration/standards/:id/points – List certificate points
// POST /api/pressure-calibration/standards/:id/points – Add certificate point
router.get('/standards',              ctrl.listStandards);
router.post('/standards',             ctrl.createStandard);
router.get('/standards/:id',          ctrl.getStandard);
router.get('/standards/:id/points',   ctrl.getStandardPoints);
router.post('/standards/:id/points',  ctrl.addStandardPoint);

// ── Sessions ─────────────────────────────────────────────────────────────────
// GET  /pressure-calibration/sessions                              – List sessions (session selector)
// POST /pressure-calibration/sessions                              – Create session
// GET  /pressure-calibration/sessions/:sessionId                   – Get session
// POST /pressure-calibration/sessions/:sessionId/readings          – Save readings
// GET  /pressure-calibration/sessions/:sessionId/readings          – Get readings
// POST /pressure-calibration/sessions/:sessionId/calculate         – Run calculation
// GET  /pressure-calibration/sessions/:sessionId/result            – Get result
router.get('/sessions',                           ctrl.listSessions);
router.post('/sessions',                          ctrl.createSession);
router.get('/sessions/:sessionId',                ctrl.getSession);
router.post('/sessions/:sessionId/readings',      ctrl.saveReadings);
router.get('/sessions/:sessionId/readings',       ctrl.getReadings);
router.post('/sessions/:sessionId/calculate',     ctrl.calculate);
router.get('/sessions/:sessionId/result',         ctrl.getResult);

module.exports = router;
