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

const INDICATOR_TYPES = new Set(['Analog', 'Digital']);

function normalizeIndicatorType(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'analog') return 'Analog';
  if (raw === 'digital') return 'Digital';
  return null;
}

function diffNullable(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return Number(a) - Number(b);
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateSessionInput(body) {
  const errors = [];
  if (!body.instrumentId) errors.push('instrumentId is required.');
  if (!body.standardId)   errors.push('standardId is required.');
  if (!body.calibrationDate) errors.push('calibrationDate is required.');

  if (body.indicatorType !== undefined && body.indicatorType !== null && body.indicatorType !== '') {
    const indicatorType = normalizeIndicatorType(body.indicatorType);
    if (!indicatorType || !INDICATOR_TYPES.has(indicatorType)) {
      errors.push('indicatorType must be Analog or Digital.');
    }
  }

  if (body.resolution !== undefined && body.resolution !== null && body.resolution !== '') {
    const resolution = Number(body.resolution);
    if (Number.isNaN(resolution) || resolution <= 0) {
      errors.push('resolution must be a positive number.');
    }
  }

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

function normalizeRegressionCoefficientsInput(coefficients) {
  if (coefficients === undefined || coefficients === null) return [];
  if (!Array.isArray(coefficients)) {
    const err = new Error('regressionCoefficients must be an array.');
    err.statusCode = 400;
    throw err;
  }

  return coefficients.map((row, idx) => {
    const rowLabel = Number(row?.rowLabel);
    const AL = Number(row?.AL);
    const AM = Number(row?.AM);
    const AN = Number(row?.AN);
    const AO = Number(row?.AO);

    if (!Number.isFinite(rowLabel)) {
      const err = new Error(`regressionCoefficients[${idx}].rowLabel must be numeric.`);
      err.statusCode = 400;
      throw err;
    }
    if (![AL, AM, AN, AO].every(Number.isFinite)) {
      const err = new Error(`regressionCoefficients[${idx}] AL/AM/AN/AO must be numeric.`);
      err.statusCode = 400;
      throw err;
    }

    return {
      rowLabel,
      AL,
      AM,
      AN,
      AO,
    };
  });
}

function normalizeAdditionalUncertaintyInput(value) {
  if (value === undefined || value === null || value === '') return undefined;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    const err = new Error('additionalUncertainty must be a non-negative number.');
    err.statusCode = 400;
    throw err;
  }

  return numeric;
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

  const indicatorType = normalizeIndicatorType(body.indicatorType) || 'Digital';
  const resolution = (body.resolution === undefined || body.resolution === null || body.resolution === '')
    ? 1
    : Number(body.resolution);

  const sessionId = await repo.createSession({
    instrumentId:    body.instrumentId,
    standardId:      body.standardId,
    calibrationDate: body.calibrationDate,
    temperature:     body.temperature    ?? null,
    humidity:        body.humidity       ?? null,
    pic:             body.pic            || null,
    uutUnit:         body.uutUnit        || null,
    standardUnit:    body.standardUnit   || null,
    indicatorType,
    resolution,
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
async function calculate(sessionId, options = {}) {
  const regressionCoefficients = normalizeRegressionCoefficientsInput(
    options.regressionCoefficients
  );
  const additionalUncertainty = normalizeAdditionalUncertaintyInput(
    options.additionalUncertainty
  );

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
      regressionCoefficients,
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

  const sortedPoints = [...byPoint.values()].sort(
    (a, b) => a.pointIndex - b.pointIndex
  );
  const zeroPoint = sortedPoints.find((p) => Number(p.nominalValue) === 0) || sortedPoints[0] || null;
  const zeroPointReadings = zeroPoint ? zeroPoint.readings : [];

  for (const pt of sortedPoints) {
    const {
      uutInc,
      uutDec,
      stdInc,
      stdDec,
      uutMean,
      standardMean,
    } = formulaSvc.groupAndAverage(pt.readings);

    const allUutReadings = pt.readings.map((r) => r.uutReading);
    const repeatability = formulaSvc.calcWorkbookRepeatability(
      pt.readings,
      zeroPointReadings
    );

    const errorValue = formulaSvc.calcError(
      uutMean       ?? 0,
      standardMean  ?? 0,
      levelCorrection
    );

    pointResults.push({
      pointIndex:   pt.pointIndex,
      nominalValue: pt.nominalValue,
      dataNaikStandar: stdInc,
      dataNaikUut:     uutInc,
      dataNaikError:   diffNullable(uutInc, stdInc),
      dataTurunStandar: stdDec,
      dataTurunUut:     uutDec,
      dataTurunError:   diffNullable(uutDec, stdDec),
      uutMean:      uutMean,
      standardMean: standardMean,
      levelCorrection,
      errorValue,
      repeatability,
      allUutReadings,      // kept for uncertainty budget input
    });
  }

  // 8. Compute zero deviation for all points
  const zeroDeviation = formulaSvc.calcWorkbookZeroDeviation(zeroPointReadings);

  // 9. Uncertainty budget (session-level, worst-case repeatability across all points)
  const maxRepeatability = Math.max(...pointResults.map((p) => p.repeatability));

  // certPoints[x].uncertainty contains expanded uncertainty values from the
  // standard certificate. For the session-level budget, use the maximum value.
  const certRawUncertainty = Math.max(...certPoints.map((p) => Number(p.uncertainty)));
  const certUnit = (certPoints[0] && certPoints[0].unit) || session.standard_unit || 'Pa';
  const sessionStandardUnit = session.standard_unit || certUnit;
  const certToSessionFactor = stdCorrection.getUnitFactor(certUnit, sessionStandardUnit);
  const maxCertUncertainty = certRawUncertainty * certToSessionFactor;

  const indicatorType = normalizeIndicatorType(session.indicator_type) || 'Digital';
  const resolution = Number(session.resolution ?? 1);

  const budget = uncertaintySvc.buildUncertaintyBudget({
    zeroDeviation,
    resolution,
    indicatorType,
    maxRepeatability,
    certUncertainty: maxCertUncertainty,
    certK:           2,
    metalRule:       additionalUncertainty,
  });

  // 10. Assemble final point objects including uncertainty
  const finalPoints = pointResults.map((p) => ({
    pointIndex:              p.pointIndex,
    nominalValue:            p.nominalValue,
    dataNaikStandar:         p.dataNaikStandar,
    dataNaikUut:             p.dataNaikUut,
    dataNaikError:           p.dataNaikError,
    dataTurunStandar:        p.dataTurunStandar,
    dataTurunUut:            p.dataTurunUut,
    dataTurunError:          p.dataTurunError,
    meanStandar:             p.standardMean,
    meanUut:                 p.uutMean,
    bedaLevelAcuan:          p.levelCorrection,
    uutMean:                 p.uutMean,
    standardMean:            p.standardMean,
    levelCorrection:         p.levelCorrection,
    errorValue:              p.errorValue,
    repeatability:           p.repeatability,
    zeroDeviation,
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
      components:             budget.components,
      indicatorType,
      resolution,
      resolutionFactor:       budget.resolutionFactor,
      zeroDeviation,
      maxRepeatability,
      maxCertUncertainty,
      customRegressionCount:  regressionCoefficients.length,
      additionalUncertainty:  additionalUncertainty ?? 0.0003,
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
  const indicatorType = normalizeIndicatorType(session.indicator_type) || 'Digital';
  const resolution = Number(session.resolution ?? 1);

  const zeroDeviation = Number(first.zero_deviation ?? 0);
  const maxRepeatability = results.length
    ? Math.max(...results.map((r) => Number(r.repeatability || 0)))
    : 0;

  const certPoints = await repo.getStandardPoints(session.standard_id);
  const certRawUncertainty = certPoints.length
    ? Math.max(...certPoints.map((p) => Number(p.uncertainty || 0)))
    : 0;
  const certUnit = (certPoints[0] && certPoints[0].unit) || session.standard_unit || 'Pa';
  const sessionStandardUnit = session.standard_unit || certUnit;
  const certToSessionFactor = stdCorrection.getUnitFactor(certUnit, sessionStandardUnit);
  const maxCertUncertainty = certRawUncertainty * certToSessionFactor;

  const budget = uncertaintySvc.buildUncertaintyBudget({
    zeroDeviation,
    resolution,
    indicatorType,
    maxRepeatability,
    certUncertainty: maxCertUncertainty,
    certK: 2,
    metalRule: 0.0003,
  });

  const readings = await repo.getReadingsBySession(sessionId);
  const directionalByPoint = new Map();

  for (const r of readings) {
    const pointIndex = Number(r.point_index);
    if (!directionalByPoint.has(pointIndex)) {
      directionalByPoint.set(pointIndex, []);
    }

    directionalByPoint.get(pointIndex).push({
      cycleCode:          r.cycle_code,
      direction:          r.direction,
      uutReading:         r.uut_reading != null ? Number(r.uut_reading) : null,
      correctedStandard:  r.corrected_standard != null ? Number(r.corrected_standard) : null,
    });
  }

  return {
    sessionId,
    summary: {
      combinedUncertainty:    first.combined_uncertainty,
      effectiveDegreeFreedom: first.effective_degree_freedom,
      coverageFactor:         first.coverage_factor,
      expandedUncertainty:    first.expanded_uncertainty,
      components:             budget.components,
      indicatorType,
      resolution,
      resolutionFactor:       budget.resolutionFactor,
      zeroDeviation,
      maxRepeatability,
      maxCertUncertainty,
      additionalUncertainty:  0.0003,
    },
    points: results.map((r) => {
      const pointIndex = Number(r.point_index);
      const directionalReadings = directionalByPoint.get(pointIndex) || [];
      const grouped = directionalReadings.length
        ? formulaSvc.groupAndAverage(directionalReadings)
        : {};

      return {
      pointIndex:              pointIndex,
      nominalValue:            r.nominal_value,
      dataNaikStandar:         grouped.stdInc ?? null,
      dataNaikUut:             grouped.uutInc ?? null,
      dataNaikError:           diffNullable(grouped.uutInc, grouped.stdInc),
      dataTurunStandar:        grouped.stdDec ?? null,
      dataTurunUut:            grouped.uutDec ?? null,
      dataTurunError:          diffNullable(grouped.uutDec, grouped.stdDec),
      meanStandar:             r.standard_mean,
      meanUut:                 r.uut_mean,
      bedaLevelAcuan:          r.level_correction,
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
      };
    }),
  };
}

module.exports = {
  createSession,
  saveReadings,
  calculate,
  getResult,
};
