require('dotenv').config();

const fs = require('fs');
const path = require('path');

const repo = require('../repositories/pressure-calibration.repository');
const formula = require('../services/pressure-calibration/formula.service');
const uncertainty = require('../services/pressure-calibration/uncertainty.service');
const stdCorrection = require('../services/pressure-calibration/standardCorrection.service');

async function run() {
  try {
    const sid = Number(process.argv[2] || 13);
    if (!Number.isFinite(sid)) {
      throw new Error('Session id must be numeric.');
    }

    const session = await repo.getSessionById(sid);
    if (!session) throw new Error(`Session ${sid} not found.`);

    const certPoints = await repo.getStandardPoints(session.standard_id);
    const readings = await repo.getReadingsBySession(sid);

    const byPoint = new Map();
    for (const r of readings) {
      const key = Number(r.point_index);
      if (!byPoint.has(key)) {
        byPoint.set(key, {
          pointIndex: key,
          nominal: Number(r.nominal_value),
          rows: [],
        });
      }

      byPoint.get(key).rows.push({
        cycleCode: r.cycle_code,
        direction: r.direction,
        uutReading: Number(r.uut_reading),
        correctedStandard: r.corrected_standard == null ? null : Number(r.corrected_standard),
        standardReading: r.standard_reading == null ? null : Number(r.standard_reading),
      });
    }

    const levelCorrection = formula.calcLevelCorrection(
      Number(session.media_density),
      Number(session.gravity),
      Number(session.delta_h)
    );

    const sortedPoints = [...byPoint.values()].sort((a, b) => a.pointIndex - b.pointIndex);
    const zeroRows = (sortedPoints.find((p) => Number(p.nominal) === 0) || sortedPoints[0] || { rows: [] }).rows;

    const perPoint = sortedPoints
      .map((p) => {
        const grouped = formula.groupAndAverage(p.rows);
        const repeatability = formula.calcWorkbookRepeatability(p.rows, zeroRows);
        const errorValue = formula.calcError(
          grouped.uutMean ?? 0,
          grouped.standardMean ?? 0,
          levelCorrection
        );

        return {
          pointIndex: p.pointIndex,
          nominal: p.nominal,
          repeatability,
          errorValue,
          uutMean: grouped.uutMean,
          standardMean: grouped.standardMean,
          dataNaikStandar: grouped.stdInc,
          dataNaikUut: grouped.uutInc,
          dataTurunStandar: grouped.stdDec,
          dataTurunUut: grouped.uutDec,
          rows: p.rows,
        };
      });

    const zeroDeviation = formula.calcWorkbookZeroDeviation(zeroRows);
    const maxRepeatability = perPoint.length
      ? Math.max(...perPoint.map((p) => Number(p.repeatability) || 0))
      : 0;

    const certRawUncertainty = certPoints.length
      ? Math.max(...certPoints.map((p) => Number(p.uncertainty) || 0))
      : 0;
    const certUnit = (certPoints[0] && certPoints[0].unit) || session.standard_unit || 'Pa';
    const sessionStandardUnit = session.standard_unit || certUnit;
    const certToSessionFactor = stdCorrection.getUnitFactor(certUnit, sessionStandardUnit);
    const maxCertUncertainty = certRawUncertainty * certToSessionFactor;

    const budget = uncertainty.buildUncertaintyBudget({
      zeroDeviation,
      maxRepeatability,
      certUncertainty: maxCertUncertainty,
      certK: 2,
      resolution: Number(session.resolution ?? 1),
      indicatorType: session.indicator_type || 'Digital',
      metalRule: 0.0003,
    });

    const result = {
      sessionId: sid,
      standardId: session.standard_id,
      indicatorType: session.indicator_type,
      resolution: Number(session.resolution),
      levelCorrection,
      zeroDeviation,
      maxRepeatability,
      maxCertUncertainty,
      certPoints,
      perPoint,
      budget: {
        components: budget.components.map((c) => ({
          name: c.name,
          u: c.u,
          divisor: c.divisor,
          ui: c.ui,
          ci: c.ci,
          uici: c.uici,
          square: c.square,
          nu: c.nu,
          fourthOverNu: c.fourthOverNu,
        })),
        uc: budget.combinedUncertainty,
        veff: budget.effectiveDegreeFreedom,
        k: budget.coverageFactor,
        U: budget.expandedUncertainty,
      },
    };

    const outFile = path.join(__dirname, `session${sid}-backend-breakdown.json`);
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ outFile, sessionId: sid, standardId: session.standard_id }, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
