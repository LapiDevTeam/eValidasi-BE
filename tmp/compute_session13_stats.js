require('dotenv').config();

const fs = require('fs');
const repo = require('../repositories/pressure-calibration.repository');
const formula = require('../services/pressure-calibration/formula.service');
const uncertainty = require('../services/pressure-calibration/uncertainty.service');

async function run() {
    try {
        const sid = 13;
        const session = await repo.getSessionById(sid);
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
                correctedStandard: Number(r.corrected_standard),
            });
        }

        const levelCorrection = formula.calcLevelCorrection(
            Number(session.media_density),
            Number(session.gravity),
            Number(session.delta_h)
        );

        const perPoint = [...byPoint.values()]
            .sort((a, b) => a.pointIndex - b.pointIndex)
            .map((p) => {
                const grouped = formula.groupAndAverage(p.rows);
                const repeatability = formula.calcRepeatability(p.rows.map((x) => x.uutReading));
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
                };
            });

        const zeroPoint = perPoint.find((p) => p.nominal === 0) || perPoint[0];
        const errorAtZero = zeroPoint ? zeroPoint.errorValue : 0;
        const zeroDeviation = formula.calcZeroDeviation(errorAtZero);
        const maxRepeatability = Math.max(...perPoint.map((p) => p.repeatability));
        const maxCertUncertainty = Math.max(...certPoints.map((p) => Number(p.uncertainty) || 0));

        const budget = uncertainty.buildUncertaintyBudget({
            zeroDeviation,
            maxRepeatability,
            certUncertainty: maxCertUncertainty,
            certK: 2,
            resolution: Number(session.resolution ?? 1),
            indicatorType: session.indicator_type || 'Digital',
        });

        const result = {
            indicatorType: session.indicator_type,
            resolution: Number(session.resolution),
            levelCorrection,
            errorAtZero,
            zeroDeviation,
            maxRepeatability,
            maxCertUncertainty,
            perPoint,
            budget: {
                components: budget.components.map((c) => ({
                    name: c.name,
                    u: c.u,
                    divisor: c.divisor,
                    ui: c.ui,
                    nu: c.nu,
                })),
                uc: budget.combinedUncertainty,
                veff: budget.effectiveDegreeFreedom,
                k: budget.coverageFactor,
                U: budget.expandedUncertainty,
            },
        };

        fs.writeFileSync('tmp/session13-backend-breakdown.json', JSON.stringify(result, null, 2));
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
