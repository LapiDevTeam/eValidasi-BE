require('dotenv').config();

const fs = require('fs');
const path = require('path');

const repo = require('../repositories/pressure-calibration.repository');

const CYCLE_MAP = {
  X1: { area: 'increasing', col: 0, field: 'uut' },
  X2: { area: 'decreasing', col: 0, field: 'uut' },
  X3: { area: 'increasing', col: 1, field: 'uut' },
  X4: { area: 'decreasing', col: 1, field: 'uut' },
  X5: { area: 'increasing', col: 2, field: 'uut' },
  X6: { area: 'decreasing', col: 2, field: 'uut' },
};

const STD_CYCLE_MAP = {
  X1: { area: 'increasing', col: 0, field: 'std' },
  X2: { area: 'decreasing', col: 0, field: 'std' },
  X3: { area: 'increasing', col: 1, field: 'std' },
  X4: { area: 'decreasing', col: 1, field: 'std' },
  X5: { area: 'increasing', col: 2, field: 'std' },
  X6: { area: 'decreasing', col: 2, field: 'std' },
};

function makeRow() {
  return {
    increasing: [
      { uut: null, std: null },
      { uut: null, std: null },
      { uut: null, std: null },
    ],
    decreasing: [
      { uut: null, std: null },
      { uut: null, std: null },
      { uut: null, std: null },
    ],
  };
}

async function run() {
  try {
    const sid = Number(process.argv[2] || 14);
    if (!Number.isFinite(sid)) throw new Error('Session id must be numeric.');

    const session = await repo.getSessionById(sid);
    if (!session) throw new Error(`Session ${sid} not found.`);

    const certPoints = await repo.getStandardPoints(session.standard_id);
    const readings = await repo.getReadingsBySession(sid);
    const byPoint = new Map();

    for (const r of readings) {
      const idx = Number(r.point_index);
      if (!byPoint.has(idx)) {
        byPoint.set(idx, {
          pointIndex: idx,
          nominalValue: Number(r.nominal_value),
          ...makeRow(),
        });
      }

      const row = byPoint.get(idx);
      const cycle = String(r.cycle_code || '').toUpperCase();

      const uutMap = CYCLE_MAP[cycle];
      const stdMap = STD_CYCLE_MAP[cycle];

      if (uutMap) {
        row[uutMap.area][uutMap.col][uutMap.field] =
          r.uut_reading == null ? null : Number(r.uut_reading);
      }
      if (stdMap) {
        row[stdMap.area][stdMap.col][stdMap.field] =
          r.standard_reading == null ? null : Number(r.standard_reading);
      }
    }

    const points = [...byPoint.values()].sort((a, b) => a.pointIndex - b.pointIndex);

    const out = {
      sessionId: sid,
      standardId: Number(session.standard_id),
      session: {
        standardUnit: session.standard_unit || null,
        uutUnit: session.uut_unit || null,
        resolution: session.resolution == null ? null : Number(session.resolution),
        indicatorType: session.indicator_type || null,
        deltaH: session.delta_h == null ? null : Number(session.delta_h),
        mediaDensity: session.media_density == null ? null : Number(session.media_density),
        gravity: session.gravity == null ? null : Number(session.gravity),
      },
      certPoints: (certPoints || [])
        .map((p) => ({
          actualPressure: p.actual_pressure == null ? null : Number(p.actual_pressure),
          indicatorIncreasing: p.indicator_increasing == null ? null : Number(p.indicator_increasing),
          indicatorDecreasing: p.indicator_decreasing == null ? null : Number(p.indicator_decreasing),
          uncertainty: p.uncertainty == null ? null : Number(p.uncertainty),
          unit: p.unit || null,
        }))
        .sort((a, b) => Number(a.actualPressure) - Number(b.actualPressure)),
      points,
    };

    const outFile = path.join(__dirname, `session${sid}-workbook-input.json`);
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({ outFile, pointCount: points.length }, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
