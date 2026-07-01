'use strict';

/**
 * pressure-calibration.router.js
 *
 * All routes for the pressure calibration module.
 * Mounted at: /pressure-calibration  (see routers/index.js)
 *
 */

const express = require('express');
const router  = express.Router();

const { authentication } = require('../../middlewares/authentication');

const ctrl = require('../../controllers/transactions/pressure-calibration.controller');

// GET /pressure-calibration/da-bagian-history?qa_id=QA-BA-000004
router.get('/da-bagian-history', authentication, ctrl.getDaBagianHistory);

// ── Instruments (read-only) ──────────────────────────────────────────────────
// GET  /api/pressure-calibration/instruments          – List instruments
// GET  /api/pressure-calibration/instruments/:id      – Get one instrument
router.get('/instruments',        ctrl.listInstruments);
router.get('/instruments/export', ctrl.exportInstruments);
router.get('/instruments/:instrumentType/:id', ctrl.getInstrumentByType);
router.get('/instruments/:id',    ctrl.getInstrument);
router.post('/instruments',    ctrl.createInstrument);
router.put('/instruments/:instrumentType/:id',    ctrl.updateInstrument);
router.put('/instruments/:id',                    ctrl.updateInstrument);
router.delete('/instruments/:instrumentType/:id', ctrl.deleteInstrument);
router.delete('/instruments/:id',                 ctrl.deleteInstrument);

// ── Calibration Standards ────────────────────────────────────────────────────
// GET  /api/pressure-calibration/standards            – List standards
// POST /api/pressure-calibration/standards            – Create standard
// PUT  /api/pressure-calibration/standards/:id         – Update standard
// DELETE /api/pressure-calibration/standards/:id       – Soft delete standard
// GET  /api/pressure-calibration/standards/:id        – Get standard detail
// GET  /api/pressure-calibration/standards/:id/points – List certificate points
// POST /api/pressure-calibration/standards/:id/points – Add certificate point
router.get('/standards',              ctrl.listStandards);
router.post('/standards',             ctrl.createStandard);
router.put('/standards/:id',          ctrl.updateStandard);
router.delete('/standards/:id',       ctrl.deleteStandard);
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
router.put('/sessions/:sessionId/evaluation',     ctrl.updateEvaluationResult);

module.exports = router;
