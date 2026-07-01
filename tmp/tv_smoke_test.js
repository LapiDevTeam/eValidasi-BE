'use strict';
require('dotenv').config();
const sql = require('mssql');
const calc = require('../src/services/tappedVolumeterCalculation.service');
const repo = require('../repositories/tapped-volumeter-calibration.repository');

const near = (a, b, t = 1e-6) => Math.abs(Number(a) - Number(b)) <= t;
const EXP = { e1: 246.476811014717, e2: 247.643775752826 };

async function main() {
  let sessionId = null;
  let fail = 0;
  try {
    // create
    const { sessionId: sid } = await calc.createSession({
      session_code: 'TV-SMOKE-' + Date.now(),
      instrument_code: 'TV-SMOKE', instrument_name: 'TV Smoke',
      nominal_target: 250, lower_limit: 235, upper_limit: 265.5,
      tolerance_text: '250 ± 15 ketukan/menit (235 - 265 ketukan/menit)',
    }, 'SMOKE');
    sessionId = sid;
    console.log('created session', sessionId);

    // saveWorkbook
    const saved = await calc.saveWorkbook(sessionId, {
      settings: [
        { setting_no: 1, setting_value: 25, error_std: 0.003, readings: [
          { sequence_no: 1, jumlah_ketukan: 25, waktu: 6.086 },
          { sequence_no: 2, jumlah_ketukan: 25, waktu: 6.103 },
          { sequence_no: 3, jumlah_ketukan: 25, waktu: 6.101 },
          { sequence_no: 4, jumlah_ketukan: 25, waktu: 6.069 },
          { sequence_no: 5, jumlah_ketukan: 25, waktu: 6.07 },
        ]},
        { setting_no: 2, setting_value: 50, error_std: 0.005, readings: [
          { sequence_no: 1, jumlah_ketukan: 50, waktu: 12.144 },
          { sequence_no: 2, jumlah_ketukan: 50, waktu: 12.122 },
          { sequence_no: 3, jumlah_ketukan: 50, waktu: 12.098 },
          { sequence_no: 4, jumlah_ketukan: 50, waktu: 12.097 },
          { sequence_no: 5, jumlah_ketukan: 50, waktu: 12.11 },
        ]},
      ],
    });
    console.log('saved', saved);
    if (saved.settings !== 2 || saved.readings !== 10) { fail++; console.log('SAVE COUNT MISMATCH'); }

    // calculate
    const calced = await calc.calculate(sessionId, 'SMOKE');
    console.log('calc conclusion =', calced.conclusion);

    // getBundle -> assert values that came BACK from DB
    const bundle = await calc.getSessionBundle(sessionId);
    const r = bundle.results.sort((a,b)=>a.setting_no-b.setting_no);
    console.log('DB result s1 E =', r[0].mean_ketukan_per_menit, 'ms=', r[0].ms_tms);
    console.log('DB result s2 E =', r[1].mean_ketukan_per_menit, 'ms=', r[1].ms_tms);
    if (!near(r[0].mean_ketukan_per_menit, EXP.e1)) { fail++; console.log('S1 MISMATCH'); }
    if (!near(r[1].mean_ketukan_per_menit, EXP.e2)) { fail++; console.log('S2 MISMATCH'); }
    if (r[0].ms_tms !== 'MS' || r[1].ms_tms !== 'MS') { fail++; console.log('MS FLAG MISMATCH'); }
    if (bundle.summary?.conclusion !== 'MEMENUHI SYARAT') { fail++; console.log('CONCLUSION MISMATCH:', bundle.summary?.conclusion); }
    if (bundle.workbook.settings.length !== 2 || bundle.workbook.readings.length !== 10) { fail++; console.log('BUNDLE WORKBOOK COUNT MISMATCH'); }
  } catch (e) {
    fail++; console.error('SMOKE ERROR:', e.message);
  } finally {
    // deleteSessionGraph
    if (sessionId) {
      try { const del = await repo.deleteSessionGraph(sessionId); console.log('deleted session graph =', del); }
      catch (e) { fail++; console.error('DELETE ERROR:', e.message); }
    }
    try { await sql.close(); } catch (_) {}
  }
  console.log(fail === 0 ? 'SMOKE OK ✓' : ('SMOKE FAIL: ' + fail));
  process.exit(fail === 0 ? 0 : 1);
}
main();
