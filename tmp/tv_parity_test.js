const f = require('../src/services/tappedVolumeterFormula.service');
const input = {
  nominal_target: 250, lower_limit: 235, upper_limit: 265.5,
  settings: [
    { setting_no: 1, setting_value: 25, error_std: 0.003, readings: [
      {sequence_no:1,jumlah_ketukan:25,waktu:6.086},
      {sequence_no:2,jumlah_ketukan:25,waktu:6.103},
      {sequence_no:3,jumlah_ketukan:25,waktu:6.101},
      {sequence_no:4,jumlah_ketukan:25,waktu:6.069},
      {sequence_no:5,jumlah_ketukan:25,waktu:6.07},
    ]},
    { setting_no: 2, setting_value: 50, error_std: 0.005, readings: [
      {sequence_no:1,jumlah_ketukan:50,waktu:12.144},
      {sequence_no:2,jumlah_ketukan:50,waktu:12.122},
      {sequence_no:3,jumlah_ketukan:50,waktu:12.098},
      {sequence_no:4,jumlah_ketukan:50,waktu:12.097},
      {sequence_no:5,jumlah_ketukan:50,waktu:12.11},
    ]},
  ],
};
const out = f.computeWorkbook(input);
// Per-row E expected (E43..E47, E52..E56)
const exp1 = [246.467302004601,245.780763558905,245.861334207507,247.157686604053,247.116968698517];
const exp2 = [247.03557312253,247.48391354562,247.974871879649,247.995370753079,247.729149463253];
const expE48 = 246.476811014717, expE57 = 247.643775752826;
const expD48 = 6.0888, expD57 = 12.1192;
let fail = 0;
const near = (a,b,t=1e-9)=>Math.abs(a-b)<=t;
out.settings[0].readings.forEach((r,i)=>{ if(!near(r.ketukan_per_menit,exp1[i])){fail++;console.log('E s1 row',i,r.ketukan_per_menit,'!=',exp1[i]);} });
out.settings[1].readings.forEach((r,i)=>{ if(!near(r.ketukan_per_menit,exp2[i])){fail++;console.log('E s2 row',i,r.ketukan_per_menit,'!=',exp2[i]);} });
if(!near(out.settings[0].mean_ketukan_per_menit,expE48)){fail++;console.log('E48',out.settings[0].mean_ketukan_per_menit,'!=',expE48);}
if(!near(out.settings[1].mean_ketukan_per_menit,expE57)){fail++;console.log('E57',out.settings[1].mean_ketukan_per_menit,'!=',expE57);}
if(!near(out.settings[0].mean_waktu_plus_error,expD48,1e-9)){fail++;console.log('D48',out.settings[0].mean_waktu_plus_error,'!=',expD48);}
if(!near(out.settings[1].mean_waktu_plus_error,expD57,1e-9)){fail++;console.log('D57',out.settings[1].mean_waktu_plus_error,'!=',expD57);}
console.log('E48 =',out.settings[0].mean_ketukan_per_menit,'(exp',expE48+')','F=',out.settings[0].ms_tms);
console.log('E57 =',out.settings[1].mean_ketukan_per_menit,'(exp',expE57+')','F=',out.settings[1].ms_tms);
console.log('conclusion =',out.conclusion);
console.log(fail===0 ? 'PARITY OK ✓' : ('PARITY FAIL: '+fail+' mismatch'));
process.exit(fail===0?0:1);
