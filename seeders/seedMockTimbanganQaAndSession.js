'use strict';

/**
 * seedMockTimbanganQaAndSession.js
 *
 * Creates three complete, end-to-end mock Timbangan calibration sessions, one
 * for each pan model: Lingkaran (Circle), Persegi (Square), Segitiga (Triangle).
 *
 * This seeder creates dummy DA Timbangan entries for each session (the
 * correct DA source for Timbangan — see publishToSertifikat's
 * resolveQaCandidate), then builds and publishes the certificates.
 *
 * What it does per pan model:
 *   1. Insert/update a dummy DA Timbangan row.
 *   2. Create a Timbangan session linked to that QA_ID.
 *   3. Save workbook data with AT values taken from the live AT master.
 *   4. Calculate → status CALCULATED, conclusion LAYAK DIGUNAKAN.
 *   5. Mock approvals (Admin, Officer, Manager).
 *   6. Publish certificate to T_Kalibrasi_Sertifikat_Timbangan (+ 4 detail tables).
 *
 * Idempotent: re-running deletes the previous mock sessions + certificate
 * drafts for the dummy QA_IDs and rebuilds everything.
 *
 * Run:
 *   npm run seed:mock-timbangan-qa-session
 */

require('dotenv').config();
const sql = require('mssql');
const repo = require('../repositories/timbangan-calibration.repository');
const calc = require('../src/services/timbanganCalculation.service');

const USER_ID = 'MOCK-SEEDER';

const PAN_MODELS = [
  { key: 'CIRCLE',   label: 'Lingkaran',  qaId: 'MOCK-TIMBANGAN-QA-CIRCLE',   sessionCode: 'MOCK-TIMBANGAN-CIRCLE',   certNo: 'MOCK-SER-TIMBANGAN-CIRCLE' },
  { key: 'SQUARE',   label: 'Persegi',    qaId: 'MOCK-TIMBANGAN-QA-SQUARE',   sessionCode: 'MOCK-TIMBANGAN-SQUARE',   certNo: 'MOCK-SER-TIMBANGAN-SQUARE' },
  { key: 'TRIANGLE', label: 'Segitiga',   qaId: 'MOCK-TIMBANGAN-QA-TRIANGLE', sessionCode: 'MOCK-TIMBANGAN-TRIANGLE', certNo: 'MOCK-SER-TIMBANGAN-TRIANGLE' },
];

async function upsertDummyDaTimbangan(model) {
  const pool = await repo.getPool();
  const exists = await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('SELECT 1 FROM T_Kalibrasi_DA_Timbangan WHERE QA_ID = @QaId');

  if (exists.recordset.length) {
    console.log(`[seed] Updating existing dummy DA Timbangan ${model.qaId}.`);
    await pool.request()
      .input('QaId', sql.VarChar(50), model.qaId)
      .input('JenisKalibrasi', sql.VarChar(50), '1')
      .input('AssmNamaInstrumen', sql.VarChar(255), `Timbangan Elektronik Avery Weight - ${model.label}`)
      .input('AssmNoIdentitasIstrumen', sql.VarChar(100), 'TM 131')
      .input('AssmNoIdentitasKalibrasi', sql.VarChar(100), 'TM 131')
      .input('GroupDaDept', sql.VarChar(50), 'VN')
      .input('AssmKapasitas', sql.VarChar(100), '30 kg / 0.01 kg')
      .input('ParameterKalibrasi', sql.VarChar(100), 'Massa')
      .input('AssmLokasi', sql.VarChar(255), 'Lab. Timbangan Lantai 2')
      .input('ParameterInterval', sql.VarChar(50), '12')
      .input('Catatan', sql.VarChar(1000), `Dummy DA Timbangan untuk mock session - ${model.label}.`)
      .query(`
        UPDATE T_Kalibrasi_DA_Timbangan SET
          Jenis_kalibrasi = @JenisKalibrasi,
          Assm_nama_instrumen = @AssmNamaInstrumen,
          Assm_No_identitas_Istrumen = @AssmNoIdentitasIstrumen,
          Assm_No_identitas_kalibrasi = @AssmNoIdentitasKalibrasi,
          Group_Da_Dept = @GroupDaDept,
          Assm_Kapasitas = @AssmKapasitas,
          Parameter_Kalibrasi = @ParameterKalibrasi,
          Assm_Lokasi = @AssmLokasi,
          Parameter_Interval = @ParameterInterval,
          Catatan = @Catatan
        WHERE QA_ID = @QaId
      `);
  } else {
    console.log(`[seed] Creating dummy DA Timbangan ${model.qaId}.`);
    await pool.request()
      .input('QaId', sql.VarChar(50), model.qaId)
      .input('JenisKalibrasi', sql.VarChar(50), '1')
      .input('AssmNamaInstrumen', sql.VarChar(255), `Timbangan Elektronik Avery Weight - ${model.label}`)
      .input('AssmNoIdentitasIstrumen', sql.VarChar(100), 'TM 131')
      .input('AssmNoIdentitasKalibrasi', sql.VarChar(100), 'TM 131')
      .input('GroupDaDept', sql.VarChar(50), 'VN')
      .input('AssmKapasitas', sql.VarChar(100), '30 kg / 0.01 kg')
      .input('ParameterKalibrasi', sql.VarChar(100), 'Massa')
      .input('AssmLokasi', sql.VarChar(255), 'Lab. Timbangan Lantai 2')
      .input('ParameterInterval', sql.VarChar(50), '12')
      .input('Catatan', sql.VarChar(1000), `Dummy DA Timbangan untuk mock session - ${model.label}.`)
      .query(`
        INSERT INTO T_Kalibrasi_DA_Timbangan
          (QA_ID, Jenis_kalibrasi, Assm_nama_instrumen,
           Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept,
           Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Parameter_Interval, Catatan)
        VALUES
          (@QaId, @JenisKalibrasi, @AssmNamaInstrumen,
           @AssmNoIdentitasIstrumen, @AssmNoIdentitasKalibrasi, @GroupDaDept,
           @AssmKapasitas, @ParameterKalibrasi, @AssmLokasi, @ParameterInterval, @Catatan)
      `);
  }
}

async function cleanupPreviousMock(model) {
  const pool = await repo.getPool();

  // Bersihkan sisa dari alur lama (sebelum publish diarahkan ke T_Kalibrasi_Sertifikat_Timbangan).
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Bagian WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_DA_Bagian WHERE QA_ID = @QaId');

  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE QA_ID = @QaId');
  await pool.request()
    .input('QaId', sql.VarChar(50), model.qaId)
    .query('DELETE FROM T_Kalibrasi_Sertifikat_Timbangan WHERE QA_ID = @QaId');

  const session = await pool.request()
    .input('SessionCode', sql.VarChar(50), model.sessionCode)
    .query('SELECT session_id FROM timbangan_sessions WHERE session_code = @SessionCode');

  if (session.recordset[0]?.session_id) {
    console.log(`[seed] Deleting previous mock session ${session.recordset[0].session_id}.`);
    await repo.deleteSessionGraph(session.recordset[0].session_id);
  }
}

async function fetchAtMaster() {
  const pool = await repo.getPool();
  const result = await pool.request().query(`
    SELECT no_id, no_id_label, konvensional_g, uc_mg,
           no_sertifikat, rekalibrasi, tertelusur, kelas
    FROM [dbo].[timbangan_at_standards]
    WHERE is_active = 1
    ORDER BY konvensional_g ASC
  `);
  return result.recordset.map((r) => ({
    no_id: String(r.no_id).trim(),
    no_id_label: r.no_id_label,
    konvensional_g: Number(r.konvensional_g),
    uc_mg: Number(r.uc_mg),
    no_sertifikat: r.no_sertifikat,
    rekalibrasi: r.rekalibrasi,
    tertelusur: r.tertelusur,
    kelas: r.kelas,
  }));
}

function requireAt(atList, noIds) {
  const map = new Map(atList.map((a) => [a.no_id, a]));
  const missing = noIds.filter((id) => !map.has(String(id)));
  if (missing.length) {
    throw new Error(`AT master missing required no_id: ${missing.join(', ')}. Run migrations first.`);
  }
  return map;
}

function buildPoint(order, atRecords, targetReadingKg, unit = 'kg') {
  return {
    point_order: order,
    unit,
    standards: atRecords.map((at, i) => ({
      row_order: i + 1,
      at_no_id: at.no_id,
      konvensional_g: at.konvensional_g,
      uc_mg: at.uc_mg,
      uut_reading: targetReadingKg,
      zero_reading: 0,
    })),
  };
}

function buildWorkbook(at) {
  return {
    preadjust: [
      { row_order: 1, at_no_id: at('156').no_id, konvensional_g: at('156').konvensional_g, uut_reading: 24.99, zero_reading: 0 },
      { row_order: 2, at_no_id: at('27').no_id,  konvensional_g: at('27').konvensional_g,  uut_reading: 24.99, zero_reading: 0 },
    ],
    repeatability: Array.from({ length: 10 }, (_, i) => ({
      row_no: i + 1,
      half_zero: 0, half_reading: 14.99,
      max_zero: 0,  max_reading: 29.98,
    })),
    points: [
      buildPoint(1,  [at('25'), at('24')],       3.0001),
      buildPoint(2,  [at('27')],                 5),
      buildPoint(3,  [at('27'), at('25'), at('26')], 8.99),
      buildPoint(4,  [at('28'), at('25')],       11.99),
      buildPoint(5,  [at('28'), at('27')],       14.99),
      buildPoint(6,  [at('28'), at('27'), at('25')], 16.99),
      {
        point_order: 7,
        unit: 'kg',
        standards: [
          { row_order: 1, at_no_id: at('156').no_id, konvensional_g: at('156').konvensional_g, uc_mg: at('156').uc_mg, uut_reading: 19.99, zero_reading: 0 },
          { row_order: 2, at_no_id: null, konvensional_g: 0, uc_mg: 0, uut_reading: 19.98, zero_reading: 0 },
        ],
      },
      buildPoint(8,  [at('156'), at('25'), at('26')], 23.98),
      buildPoint(9,  [at('156'), at('27'), at('25')], 26.98),
      buildPoint(10, [at('156'), at('28')],      29.98),
    ],
    eccentricity: [
      { position: 0, baca1: 14.99, baca2: 14.99 },
      { position: 1, baca1: 14.99, baca2: 14.99 },
      { position: 2, baca1: 14.99, baca2: 14.99 },
      { position: 3, baca1: 14.99, baca2: 14.99 },
    ],
    hysteresis: [],
  };
}

async function seedOneSession(model, atList) {
  await upsertDummyDaTimbangan(model);
  await cleanupPreviousMock(model);

  const atMap = requireAt(atList, ['24', '25', '26', '27', '28', '156']);
  const at = (id) => atMap.get(String(id));

  const sessionPayload = {
    session_code: model.sessionCode,
    instrument_id: model.qaId,
    instrument_code: 'TM 131',
    instrument_name: `Timbangan Elektronik Avery Weight - ${model.label}`,
    merk_tipe: 'Avery Weight',
    no_seri: 'AW-123456',
    kapasitas_ukur: 30,
    kapasitas_alat: 30,
    unit: 'kg',
    resolusi: 0.01,
    kapasitas_resolusi: '30 kg / 0.01 kg',
    lokasi: 'Lab. Timbangan Lantai 2',
    calibration_date: '2025-10-10',
    interval_bulan: '12',
    metode_kalibrasi: 'PK.VN.000006 REV 01',
    keterangan: model.label,
    temperature: 22.7,
    humidity: 45.2,
    eccentricity_nominal_mass: 15,
    qa_id: model.qaId,
  };

  const { sessionId } = await calc.createSession(sessionPayload, USER_ID);
  console.log(`[seed] Created ${model.label} session_id=${sessionId}`);

  await calc.saveWorkbook(sessionId, buildWorkbook(at));

  const calcResult = await calc.calculate(sessionId, USER_ID);
  console.log(`[seed] ${model.label} calculated. conclusion="${calcResult.conclusion}", maxExpanded=${calcResult.maxExpanded.toFixed(6)} kg`);

  await repo.updateSession(sessionId, {
    ...sessionPayload,
    evaluation_result: 'Layak digunakan',
    qa_id: model.qaId,
    updated_by: USER_ID,
  });

  await repo.updateSessionApproval(sessionId, { roleKey: 'admin', userId: USER_ID });
  await repo.updateSessionApproval(sessionId, { roleKey: 'officer', userId: USER_ID });
  await repo.updateSessionApproval(sessionId, { roleKey: 'manager', userId: USER_ID });

  const publishResult = await calc.publishToSertifikat(sessionId, USER_ID, USER_ID, {
    qa_id: model.qaId,
    id_no_sertifikat: model.certNo,
    interval: '12',
  });
  console.log(`[seed] ${model.label} published certificate:`, publishResult.id_no_sertifikat);

  return { model, sessionId, publishResult };
}

async function main() {
  try {
    const atList = await fetchAtMaster();
    if (!atList.length) {
      throw new Error('timbangan_at_standards is empty. Run create-timbangan-at-master.sql first.');
    }

    const results = [];
    for (const model of PAN_MODELS) {
      const r = await seedOneSession(model, atList);
      results.push(r);
      console.log('');
    }

    console.log('[seed] ✔ All mock end-to-end sessions ready:');
    results.forEach((r) => {
      console.log(`  - ${r.model.label}: session_id=${r.sessionId}, QA_ID=${r.model.qaId}, certificate=${r.publishResult.id_no_sertifikat}`);
    });
  } catch (err) {
    console.error('[seed] ERROR:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    try { await (await repo.getPool()).close(); } catch (_) { /* ignore */ }
  }
}

main();
