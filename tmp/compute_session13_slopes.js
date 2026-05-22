require('dotenv').config();
const fs = require('fs');
const repo = require('../repositories/pressure-calibration.repository');

function seg(x1, y1, x2, y2) {
  const slope = (Number(y2) - Number(y1)) / (Number(x2) - Number(x1));
  const intercept = Number(y1) - slope * Number(x1);
  return { slope, intercept };
}

(async () => {
  const session = await repo.getSessionById(13);
  if (!session) throw new Error('Session 13 not found');

  const pts = await repo.getStandardPoints(session.standard_id);
  if (!pts || pts.length < 2) throw new Error('Not enough standard points');

  const inc = [...pts].sort((a, b) => Number(a.indicator_increasing) - Number(b.indicator_increasing));
  const dec = [...pts].sort((a, b) => Number(a.indicator_decreasing) - Number(b.indicator_decreasing));

  const rows = [];
  for (let i = 0; i < inc.length - 1; i++) {
    const sInc = seg(inc[i].indicator_increasing, inc[i].actual_pressure, inc[i + 1].indicator_increasing, inc[i + 1].actual_pressure);
    const sDec = seg(dec[i].indicator_decreasing, dec[i].actual_pressure, dec[i + 1].indicator_decreasing, dec[i + 1].actual_pressure);

    rows.push({
      rowLabel: 16 + i,
      AL: sInc.slope,
      AM: sInc.intercept,
      AN: sDec.slope,
      AO: sDec.intercept,
      pairIncreasing: [Number(inc[i].actual_pressure), Number(inc[i + 1].actual_pressure)],
      pairDecreasing: [Number(dec[i].actual_pressure), Number(dec[i + 1].actual_pressure)]
    });
  }

  // Mirror workbook display where last row repeats prior coefficients.
  rows.push({
    rowLabel: 22,
    AL: rows[rows.length - 1].AL,
    AM: rows[rows.length - 1].AM,
    AN: rows[rows.length - 1].AN,
    AO: rows[rows.length - 1].AO,
    pairIncreasing: rows[rows.length - 1].pairIncreasing,
    pairDecreasing: rows[rows.length - 1].pairDecreasing,
    note: 'Copied from row 21 for workbook-style display'
  });

  const out = {
    sessionId: 13,
    standardId: session.standard_id,
    pointCount: pts.length,
    rows
  };

  fs.writeFileSync('tmp/session13-AL-AM-AN-AO-node.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
