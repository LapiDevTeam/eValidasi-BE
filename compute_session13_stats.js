const { loadSessionData } = require('./repositories/calibration.repository');
const { calculatePointStats } = require('./services/formula.service');
const { calculateUncertainty } = require('./services/uncertainty.service');

async function run() {
    try {
        const sessionData = await loadSessionData(13);
        const pointStats = calculatePointStats(sessionData);
        const uncertainty = calculateUncertainty(sessionData, pointStats);

        const result = {
            indicatorType: sessionData.indicatorType,
            resolution: sessionData.resolution,
            levelCorrection: pointStats.levelCorrection,
            errorAtZero: pointStats.errorAtZero,
            zeroDeviation: pointStats.zeroDeviation,
            maxRepeatability: pointStats.maxRepeatability,
            maxCertUncertainty: pointStats.maxCertUncertainty,
            perPoint: pointStats.perPoint.map((p, i) => ({
                pointIndex: i,
                nominal: p.nominal,
                repeatability: p.repeatability,
                errorValue: p.errorValue
            })),
            budget: {
                components: uncertainty.budget.map(c => ({
                    name: c.name,
                    u: c.u,
                    divisor: c.divisor,
                    ui: c.ui,
                    nu: c.nu
                }))
            },
            uc: uncertainty.combinedUncertainty,
            veff: uncertainty.effectiveDegreesOfFreedom,
            k: uncertainty.coverageFactor,
            U: uncertainty.expandedUncertainty
        };

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();
