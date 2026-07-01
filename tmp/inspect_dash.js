require('dotenv').config();
const { mssqlSequeliez } = require('../config/configMssql');
(async () => {
  try {
    await mssqlSequeliez.authenticate();
    // Count rows where key text fields are literal '-' vs NULL vs '' in DA Bagian
    const q = `
      SELECT
        SUM(CASE WHEN Assm_nama_instrumen = '-' THEN 1 ELSE 0 END) AS nama_dash,
        SUM(CASE WHEN Assm_nama_instrumen IS NULL THEN 1 ELSE 0 END) AS nama_null,
        SUM(CASE WHEN Assm_nama_instrumen = '' THEN 1 ELSE 0 END) AS nama_empty,
        SUM(CASE WHEN Assm_Lokasi = '-' THEN 1 ELSE 0 END) AS lokasi_dash,
        SUM(CASE WHEN Assm_Lokasi IS NULL THEN 1 ELSE 0 END) AS lokasi_null,
        SUM(CASE WHEN Catatan = '-' THEN 1 ELSE 0 END) AS catatan_dash,
        SUM(CASE WHEN Catatan IS NULL OR Catatan = '' THEN 1 ELSE 0 END) AS catatan_nullempty,
        COUNT(*) AS total
      FROM T_Kalibrasi_DA_Bagian`;
    const [r] = await mssqlSequeliez.query(q);
    console.log('DA_Bagian:', JSON.stringify(r[0]));

    // sample any field literally '-' across a cert table
    const q2 = `SELECT TOP 5 QA_ID, Assm_nama_instrumen, Assm_Lokasi, Assm_Merk, SERIAL_NUMBER, Catatan
                FROM T_Kalibrasi_Sertifikat_Bagian
                WHERE Assm_Merk = '-' OR SERIAL_NUMBER = '-' OR Assm_Lokasi = '-' OR Catatan = '-' OR Assm_nama_instrumen = '-'`;
    const [r2] = await mssqlSequeliez.query(q2);
    console.log('Sertifikat_Bagian rows with literal dash:', r2.length);
    console.log(JSON.stringify(r2, null, 2));
    await mssqlSequeliez.close();
  } catch (e) {
    console.error('DBERR:', e.message);
    process.exit(2);
  }
})();
