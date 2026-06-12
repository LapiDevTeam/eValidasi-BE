'use strict';

const { validateAssessmentBody, validateStatusBody } = require('../../validators/calibration-risk-assessment.validator');
const { calculateDecision } = require('../../services/calibration-risk-assessment.service');
const repo = require('../../repositories/calibration-risk-assessment.repository');

// ──────────────────────────────────────────────────────────────
// Helper: build mapped data payload from request body + decision
// ──────────────────────────────────────────────────────────────
function buildPayload(body, decision) {
  const {
    instrumentName,
    instrumentCode,
    location,
    functionDescription,
    area,
    impactAssessment,
    severity,
    probability,
    detectability,
    severityNote,
    probabilityNote,
    detectabilityNote,
    qaId,
    assmNoIdentitasKalibrasi,
    groupDaDept,
    assmKapasitas,
    parameterKalibrasi,
  } = body;

  return {
    instrumentName,
    instrumentCode,
    location,
    functionDescription,
    area,
    impactsProductQualityCQA: impactAssessment.impactsProductQualityCQA,
    usedForCPP:               impactAssessment.usedForCPP,
    usedForGxPEnvironment:    impactAssessment.usedForGxPEnvironment,
    usedForBatchRelease:      impactAssessment.usedForBatchRelease,
    impactsSafety:            impactAssessment.impactsSafety,
    isImpactCritical:         decision.isImpactCritical,
    // When impact is critical, scoring fields are NULL
    severity:      decision.isImpactCritical ? null : Number(severity),
    probability:   decision.isImpactCritical ? null : Number(probability),
    detectability: decision.isImpactCritical ? null : Number(detectability),
    severityNote:      decision.isImpactCritical ? null : (severityNote      || null),
    probabilityNote:   decision.isImpactCritical ? null : (probabilityNote   || null),
    detectabilityNote: decision.isImpactCritical ? null : (detectabilityNote || null),
    rpn:               decision.rpn,
    riskCategory:      decision.riskCategory,
    calibrationDecision: decision.calibrationDecision,
    decisionReason:    decision.decisionReason,
    // DA instrument identity fields (optional)
    qaId:                    qaId                    || null,
    assmNoIdentitasKalibrasi: assmNoIdentitasKalibrasi || null,
    groupDaDept:             groupDaDept             || null,
    assmKapasitas:           assmKapasitas           || null,
    parameterKalibrasi:      parameterKalibrasi      || null,
  };
}

// ──────────────────────────────────────────────────────────────
// POST /api/calibration-risk-assessments
// ──────────────────────────────────────────────────────────────
const createAssessment = async (req, res, next) => {
  try {
    const { user_id } = req.user;

    const errors = validateAssessmentBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const decision = calculateDecision({
      impactAssessment: req.body.impactAssessment,
      severity:         req.body.severity,
      probability:      req.body.probability,
      detectability:    req.body.detectability,
    });

    const payload = buildPayload(req.body, decision);
    payload.status    = 'Draft';
    payload.createdBy = user_id;

    const newId = await repo.create(payload);
    const created = await repo.findById(newId);

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/calibration-risk-assessments
// ──────────────────────────────────────────────────────────────
const getAssessments = async (req, res, next) => {
  try {
    const { decision, category, instrumentCode, status, keyword } = req.query;

    const data = await repo.findAll({ decision, category, instrumentCode, status, keyword });

    return res.status(200).json({ success: true, data, count: data.length });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/calibration-risk-assessments/:id
// ──────────────────────────────────────────────────────────────
const getAssessmentById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
    }

    const data = await repo.findById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// PUT /api/calibration-risk-assessments/:id
// ──────────────────────────────────────────────────────────────
const updateAssessment = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
    }

    const existing = await repo.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const errors = validateAssessmentBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const decision = calculateDecision({
      impactAssessment: req.body.impactAssessment,
      severity:         req.body.severity,
      probability:      req.body.probability,
      detectability:    req.body.detectability,
    });

    const payload = buildPayload(req.body, decision);
    payload.updatedBy = user_id;

    await repo.update(id, payload);
    const updated = await repo.findById(id);

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// DELETE /api/calibration-risk-assessments/:id
// ──────────────────────────────────────────────────────────────
const deleteAssessment = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
    }

    const existing = await repo.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    await repo.softDelete(id);

    return res.status(200).json({
      success: true,
      data: { assessmentId: id, message: 'Assessment deleted successfully.' },
    });
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────
// PATCH /api/calibration-risk-assessments/:id/status
// ──────────────────────────────────────────────────────────────
const patchAssessmentStatus = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
    }

    const existing = await repo.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const errors = validateStatusBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    await repo.updateStatus(id, req.body.status, user_id);
    const updated = await repo.findById(id);

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  patchAssessmentStatus,
};
