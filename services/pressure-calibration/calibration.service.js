'use strict';

/**
 * calibration.service.js  –  Pressure Calibration Orchestration
 *
 * Ties together the formula engine, standard correction, uncertainty budget,
 * and the repository layer.  Controllers call only this service.
 *
 * Excel workflow reproduced here:
 *   1. Load session + standard certificate points
 *   2. Correct every raw standard reading via piecewise linear interpolation
 *   3. Group readings by nominal point and direction; compute means
 *   4. Compute level correction (Beda Level Acuan)
 *   5. Compute error, repeatability, zero deviation per point
 *   6. Build uncertainty budget (single set of components, worst-case inputs)
 *   7. Persist corrected standards + results
 *   8. Return structured result object
 */

const repo          = require('../../repositories/pressure-calibration.repository');
const formulaSvc    = require('./formula.service');
const stdCorrection = require('./standardCorrection.service');
const uncertaintySvc = require('./uncertainty.service');

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateSessionInput(body) {
  const errors = [];
  if (!body.instrumentId) errors.push('instrumentId is required.');
  if (!body.standardId)   errors.push('standardId is required.');
  if (!body.calibrationDate) errors.push('calibrationDate is required.');
  return errors;
}

function validateReadingsInput(body) {
  const errors = [];
  if (!Array.isArray(body.readings) || body.readings.length === 0) {
    errors.push('readings must be a non-empty array.');
    return errors;
  }
  body.readings.forEach((r, i) => {
    if (r.pointIndex === undefined || r.pointIndex === null) errors.push(`readings[${i}].pointIndex is required.`);
    if (r.nominalValue === undefined)   errors.push(`readings[${i}].nominalValue is required.`);
    if (!r.cycleCode)                   errors.push(`readings[${i}].cycleCode is required.`);
    if (!r.direction)                   errors.push(`readings[${i}].direction is required.`);
    if (r.uutReading === undefined)     errors.push(`readings[${i}].uutReading is required.`);
    if (r.standardReading === undefined) errors.push(`readings[${i}].standardReading is required.`);
  });
  return errors;
}

// ---------------------------------------------------------------------------
// CREATE SESSION
// ---------------------------------------------------------------------------

/**
 * Create a new calibration session.
 *
 * @param {object} body  – validated request body
 * @param {string} [createdBy]
 * @returns {Promise<{ sessionId: number }>}
 */
async function createSession(body, createdBy) {
  const errors = validateSessionInput(body);
  if (errors.length) {
    const err = new Error(errors.join(' '));
    err.statusCode = 400;
    throw err;
  }

  const sessionId = await repo.createSession({
    instrumentId:    body.instrumentId,
    standardId:      body.standardId,
    calibrationDate: body.calibrationDate,
    temperature:     body.temperature    ?? null,
    humidity:        body.humidity       ?? null,
    pic:             body.pic            || null,
    uutUnit:         body.uutUnit        || null,
    standardUnit:    body.standardUnit   || null,
    deltaH:          body.deltaH         ?? 0,
    mediaDensity:    body.mediaDensity   ?? 1.2,
    gravity:         body.gravity        ?? 9.78,
    createdBy:       createdBy           || null,
  });

  return { sessionId };
}

// ---------------------------------------------------------------------------
// SAVE READINGS
// ---------------------------------------------------------------------------

/**
 * Persist raw readings for a session.  Replaces any existing readings.
 *
 * @param {number} sessionId
 * @param {object} body
 * @returns {Promise<{ count: number }>}
 */
async function saveReadings(sessionId, body) {
  const errors = validateReadingsInput(body);
  if (errors.length) {
    const err = new Error(errors.join(' '));
    err.statusCode = 400;
    throw err;
  }

  await repo.upsertReadings(sessionId, body.readings);
  return { count: body.readings.length };
}

// ---------------------------------------------------------------------------
// CALCULATE
// ---------------------------------------------------------------------------

/**
 * Run the full calibration calculation for a session.
 *
 * Steps:
 *   1. Load session meta
 *   2. Load standard certificate points
 *   3. Load raw readings
 *   4. Correct standard readings
 *   5. Persist corrected_standard values
 *   6. Group by nominal point; compute averages
 *   7. Compute level correction
 *   8. Compute error, repeatability, zero deviation per point
 *   9. Build uncertainty budget
 *  10. Persist results
 *  11. Return result object
 *
 * @param {number} sessionId
 * @returns {Promise<object>}  – structured result ready for API response
 */
async function calculate(sessionId) {
  // 1. Load session
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  // 2. Load certificate points for the linked standard
  const certPoints = await repo.getStandardPoints(session.standard_id);
  if (!certPoints || certPoints.length < 2) {
    const err = new Error(
      `Standard ${session.standard_id} has fewer than 2 certificate points. Cannot interpolate.`
    );
    err.statusCode = 422;
    throw err;
  }

  // 3. Load raw readings
  const rawReadings = await repo.getReadingsBySession(sessionId);
  if (!rawReadings || rawReadings.length === 0) {
    const err = new Error(`No readings found for session ${sessionId}.`);
    err.statusCode = 422;
    throw err;
  }

  // 4. Correct standard readings using piecewise linear interpolation
  //    Pass unit context so the correction function converts between the session's
  //    reading unit (e.g. Pa) and the certificate's stored unit (e.g. Bar).
  const { correctedReadings, warnings } = stdCorrection.applyCorrections(
    rawReadings,
    certPoints,
    {
      readingUnit: session.standard_unit || 'Pa',
      certUnit:    (certPoints[0] && certPoints[0].unit) || 'Bar',
    }
  );

  // 5. Persist corrected_standard back to DB
  await repo.updateCorrectedStandards(
    correctedReadings.map((r) => ({
      reading_id:         r.reading_id,
      correctedStandard:  r.correctedStandard,
    }))
  );

  // 6. Group readings by nominal point
  const byPoint = new Map();
  for (const r of correctedReadings) {
    const key = r.point_index;
    if (!byPoint.has(key)) {
      byPoint.set(key, {
        pointIndex:    r.point_index,
        nominalValue:  Number(r.nominal_value),
        readings:      [],
      });
    }
    byPoint.get(key).readings.push({
      cycleCode:          r.cycle_code,
      direction:          r.direction,
      uutReading:         Number(r.uut_reading),
      correctedStandard:  r.correctedStandard,
    });
  }

  // Session-level parameters
  const mediaDensity  = Number(session.media_density);
  const gravity       = Number(session.gravity);
  const deltaH        = Number(session.delta_h);

  // Level correction is the same for all points (fixed geometry)
  const levelCorrection = formulaSvc.calcLevelCorrection(mediaDensity, gravity, deltaH);

  // 7. Compute per-point results
  const pointResults = [];
  let errorAtZero    = null;   // used to propagate zero deviation

  const sortedPoints = [...byPoint.values()].sort(
    (a, b) => a.pointIndex - b.pointIndex
  );

  for (const pt of sortedPoints) {
    const { uutMean, standardMean } = formulaSvc.groupAndAverage(pt.readings);

    const allUutReadings = pt.readings.map((r) => r.uutReading);
    const repeatability  = formulaSvc.calcRepeatability(allUutReadings);

    const errorValue = formulaSvc.calcError(
      uutMean       ?? 0,
      standardMean  ?? 0,
      levelCorrection
    );

    // Capture error at the zero nominal point
    if (pt.nominalValue === 0 && errorAtZero === null) {
      errorAtZero = errorValue;
    }

    pointResults.push({
      pointIndex:   pt.pointIndex,
      nominalValue: pt.nominalValue,
      uutMean:      uutMean,
      standardMean: standardMean,
      levelCorrection,
      errorValue,
      repeatability,
      allUutReadings,      // kept for uncertainty budget input
    });
  }

  // 8. Compute zero deviation for all points
  const zeroError = errorAtZero ?? (pointResults[0] ? pointResults[0].errorValue : 0);

  // 9. Uncertainty budget (session-level, worst-case repeatability across all points)
  const maxRepeatability = Math.max(...pointResults.map((p) => p.repeatability));

  // TODO: Replace hard-coded resolution and certUncertainty with values from
  //       the instrument master table and the standard certificate.
  //       - session.resolution  → pull from instrument master (INSTRUMENT_CONFIG)
  //       - certPoints[x].uncertainty contains certificate expanded uncertainty per point
  //         Typically use the uncertainty at the point closest to the measured value.
  //         For a simplified session-level budget, use the maximum cert uncertainty.
  const maxCertUncertainty = Math.max(...certPoints.map((p) => Number(p.uncertainty)));

  // TODO: Pull resolution from the instrument master table.
  //       Placeholder: 1.0 Pa.  Replace with actual instrument resolution.
  const resolution = 1.0;

  // TODO: Confirm uDeltaH (height measurement uncertainty) with your lab procedure.
  const uDeltaH = 0.001; // metres; typical tape-measure uncertainty half-width

  const budget = uncertaintySvc.buildUncertaintyBudget({
    resolution,
    maxRepeatability,
    certUncertainty: maxCertUncertainty,
    certK:           2,
    mediaDensity,
    gravity,
    uDeltaH,
    numReadings:     Math.floor(rawReadings.length / sortedPoints.length) || 3,
  });

  // 10. Assemble final point objects including uncertainty
  const finalPoints = pointResults.map((p) => ({
    pointIndex:              p.pointIndex,
    nominalValue:            p.nominalValue,
    uutMean:                 p.uutMean,
    standardMean:            p.standardMean,
    levelCorrection:         p.levelCorrection,
    errorValue:              p.errorValue,
    repeatability:           p.repeatability,
    zeroDeviation:           formulaSvc.calcZeroDeviation(zeroError),
    combinedUncertainty:     budget.combinedUncertainty,
    effectiveDegreeFreedom:  budget.effectiveDegreeFreedom,
    coverageFactor:          budget.coverageFactor,
    expandedUncertainty:     budget.expandedUncertainty,
    lowerLimit:              null,  // TODO: set from instrument spec or tolerance
    upperLimit:              null,  // TODO: set from instrument spec or tolerance
  }));

  // 11. Persist results
  await repo.upsertResults(sessionId, finalPoints);

  // Update session status to CALCULATED
  await repo.updateSessionStatus(sessionId, 'CALCULATED');

  return {
    sessionId,
    summary: {
      combinedUncertainty:    budget.combinedUncertainty,
      effectiveDegreeFreedom: budget.effectiveDegreeFreedom,
      coverageFactor:         budget.coverageFactor,
      expandedUncertainty:    budget.expandedUncertainty,
    },
    points:   finalPoints,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// GET RESULT
// ---------------------------------------------------------------------------

/**
 * Retrieve previously calculated results for a session.
 *
 * @param {number} sessionId
 * @returns {Promise<object>}
 */
async function getResult(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) {
    const err = new Error(`Session ${sessionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const results = await repo.getResultsBySession(sessionId);

  if (!results || results.length === 0) {
    const err = new Error(
      `No calculated results for session ${sessionId}. Run POST /calculate first.`
    );
    err.statusCode = 404;
    throw err;
  }

  const first = results[0];
  return {
    sessionId,
    summary: {
      combinedUncertainty:    first.combined_uncertainty,
      effectiveDegreeFreedom: first.effective_degree_freedom,
      coverageFactor:         first.coverage_factor,
      expandedUncertainty:    first.expanded_uncertainty,
    },
    points: results.map((r) => ({
      pointIndex:              r.point_index,
      nominalValue:            r.nominal_value,
      uutMean:                 r.uut_mean,
      standardMean:            r.standard_mean,
      levelCorrection:         r.level_correction,
      errorValue:              r.error_value,
      repeatability:           r.repeatability,
      zeroDeviation:           r.zero_deviation,
      combinedUncertainty:     r.combined_uncertainty,
      effectiveDegreeFreedom:  r.effective_degree_freedom,
      coverageFactor:          r.coverage_factor,
      expandedUncertainty:     r.expanded_uncertainty,
      lowerLimit:              r.lower_limit,
      upperLimit:              r.upper_limit,
    })),
  };
}

module.exports = {
  createSession,
  saveReadings,
  calculate,
  getResult,
};
