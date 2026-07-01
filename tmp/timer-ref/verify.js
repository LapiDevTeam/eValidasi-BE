const f = require('../../src/services/timerFormula.service');
const rows = [
  [0,0,6,317, 0,0,6,0],
  [0,0,6,281, 0,0,6,0],
  [0,0,6,541, 0,0,6,0],
  [0,0,6,101, 0,0,6,0],
  [0,0,6,378, 0,0,6,0],
  [0,0,6,441, 0,0,6,0],
  [0,0,6,659, 0,0,6,0],
  [0,0,5,988, 0,0,6,0],
];
const mk = r => ({std_jam:r[0],std_menit:r[1],std_detik:r[2],std_mdetik:r[3],uut_jam:r[4],uut_menit:r[5],uut_detik:r[6],uut_mdetik:r[7]});
const readings8 = rows.map(mk);
// add two all-zero "blank" rows (what the app might pad)
const readings10 = readings8.concat([mk([0,0,0,0,0,0,0,0]),mk([0,0,0,0,0,0,0,0])]);

const opts = { correctionStd:0.044, ucStd:0.04, digitalRes:0, analogRes:0.2 };
for (const [label, rd] of [['8 rows', readings8], ['10 rows (2 padded blank)', readings10]]) {
  const c = f.computePoint({ ...opts, readings: rd });
  console.log(`--- ${label} (entered=${c.enteredCount}) ---`);
  console.log('SD          =', c.sdSec,        '(workbook 0.220005681744813)');
  console.log('uRepeat AB14 =', c.uRepeatability,'(workbook 0.0695719052491737)');
  console.log('uAnalog AB17 =', c.uAnalogRes,  '(workbook 0.0816496580927726)');
  console.log('uCert   AB18 =', c.uCertificate,'(workbook 0.02)');
  console.log('uComb   AB20 =', c.uCombined,   '(workbook 0.109118819030755)');
  console.log('uExp    AB23 =', c.uExpandedSec,'(workbook 0.21823763806151)');
  console.log('meanErr U25  =', c.meanErrorSec,'(workbook -0.38225)');
}
