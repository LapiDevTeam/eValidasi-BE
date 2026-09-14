'use strict';

/**
 * Memeriksa apakah cetak terkontrol (printForm) siap dipakai: keadaan tabel DAN
 * prasyarat render PDF.
 *
 *   node verify-printform-tables.js
 *
 * Dibuat karena dua kegagalan pertama pilot ini sama-sama soal keadaan tabel,
 * dan keduanya baru ketahuan dari stack trace saat aplikasi berjalan:
 *
 *   Invalid column name 'job_id'      -> tabel ada, tapi tabel milik orang lain
 *   Invalid object name 'printform_jobs' -> migrasi belum dijalankan ulang
 *
 *   Could not find Chrome (ver. ...)  -> Chrome milik Puppeteer belum terunduh
 *
 * Skrip ini menjawab pertanyaan itu langsung, sebelum aplikasi dijalankan.
 */

require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const { configMssql } = require('./config/configMssql');

/**
 * Kolom penanda dipilih yang paling khas untuk tiap tabel — kalau kolom itu ada,
 * tabelnya hampir pasti memang milik fitur ini dan bukan tabel lain yang senama.
 */
const EXPECTED = [
  { table: 'print_quota_rules', marker: 'max_copies' },
  { table: 'print_quota_ledger', marker: 'copies_committed' },
  { table: 'printform_jobs', marker: 'job_id' },
  { table: 'print_events', marker: 'failed_attempts' },
];

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

async function main() {
  const pool = await sql.connect(configMssql);
  console.log(`\n  Database : ${configMssql.database} @ ${configMssql.server}\n`);

  let problems = 0;

  for (const { table, marker } of EXPECTED) {
    const result = await pool.request()
      .input('Table', sql.NVarChar(128), `dbo.${table}`)
      .input('Marker', sql.NVarChar(128), marker)
      .query(`
        SELECT
          OBJECT_ID(@Table, 'U')            AS object_id,
          COL_LENGTH(@Table, @Marker)       AS marker_len
      `);

    const { object_id, marker_len } = result.recordset[0];

    if (object_id === null) {
      console.log(`  ${RED}TIDAK ADA${RESET}  ${table}`);
      console.log(`             ${DIM}jalankan: node run-migration.js migrations/create-print-quota-tables.sql${RESET}`);
      problems += 1;
    } else if (marker_len === null) {
      // Tabel ada tapi bukan milik kita — inilah kasus tabrakan nama yang dulu
      // lolos diam-diam lewat penjaga IF OBJECT_ID(...) IS NULL.
      console.log(`  ${RED}SALAH${RESET}      ${table}`);
      console.log(`             ${DIM}tabel ada tapi tidak punya kolom '${marker}' — kemungkinan tabel lain yang senama${RESET}`);
      problems += 1;
    } else {
      const count = await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.${table}`);
      console.log(`  ${GREEN}OK${RESET}         ${table}  ${DIM}(${count.recordset[0].n} baris)${RESET}`);
    }
  }

  // Aturan kuota adalah data, bukan skema — tabelnya bisa ada tapi kosong, dan
  // fitur tetap tidak jalan karena tidak ada aturan yang bisa dipakai.
  if (problems === 0) {
    const rule = await pool.request().query(`
      SELECT document_type, max_copies, scope, enforce, is_active
      FROM dbo.print_quota_rules
      WHERE document_type = 'sertifikat-bagian'
    `);

    console.log('');
    if (rule.recordset.length === 0) {
      console.log(`  ${YELLOW}PERINGATAN${RESET} Tidak ada aturan kuota untuk 'sertifikat-bagian'.`);
      console.log(`             ${DIM}Cetak akan gagal dengan 'no_rule'. Jalankan ulang migrasinya.${RESET}`);
      problems += 1;
    } else {
      const r = rule.recordset[0];
      console.log(`  Aturan aktif : ${r.document_type} -> ${r.max_copies} copy, ` +
                  `scope ${r.scope}, enforce ${r.enforce ? 'ya' : 'tidak'}`);
    }
  }

  // Tabel prototype lama tidak menghalangi apa pun, tapi keberadaannya menjelaskan
  // kenapa tabel job kita bernama printform_jobs — layak disebut, bukan didiamkan.
  const legacy = await pool.request().query(`
    SELECT OBJECT_ID('dbo.print_jobs', 'U') AS old_jobs,
           OBJECT_ID('dbo.printer_profiles', 'U') AS old_profiles
  `);
  const { old_jobs, old_profiles } = legacy.recordset[0];
  if (old_jobs !== null || old_profiles !== null) {
    console.log('');
    console.log(`  ${DIM}Catatan: tabel prototype lama masih ada` +
                `${old_jobs !== null ? ' print_jobs' : ''}` +
                `${old_profiles !== null ? ' printer_profiles' : ''}.`);
    console.log(`  Tidak dibaca apa pun; aman dihapus kalau mau.${RESET}`);
  }

  await reportHeldQuota(pool);

  problems += checkChrome();

  console.log('');
  if (problems === 0) {
    console.log(`  ${GREEN}Siap dipakai.${RESET}\n`);
  } else {
    console.log(`  ${RED}${problems} masalah ditemukan.${RESET}\n`);
    process.exitCode = 1;
  }

  await pool.close();
}

/**
 * Melaporkan jatah yang sedang ditahan job yang belum selesai.
 *
 * Ini penyebab "jatah habis" yang paling membingungkan: `copies_committed` masih
 * 0 — belum ada yang benar-benar tercetak — tapi cetak tetap ditolak karena
 * reservasinya belum dilepas. Terjadi kalau laporan hasil dari printForm tidak
 * pernah sampai (mis. callbackUrl salah alamat), dan baru bersih sendiri setelah
 * job kedaluwarsa lalu disapu cron.
 */
async function reportHeldQuota(pool) {
  const held = await pool.request().query(`
    SELECT document_type, document_id, copies_committed, copies_reserved, updated_at
    FROM dbo.print_quota_ledger
    WHERE copies_reserved > 0
    ORDER BY updated_at DESC
  `);

  if (held.recordset.length === 0) return;

  console.log('');
  console.log(`  ${YELLOW}Jatah sedang ditahan${RESET}`);
  for (const row of held.recordset) {
    console.log(`    ${row.document_id}  terpakai ${row.copies_committed}, ditahan ${row.copies_reserved}`);
  }

  const pending = await pool.request().query(`
    SELECT job_id, document_id, created_at, expires_at,
           DATEDIFF(MINUTE, GETDATE(), expires_at) AS minutes_left
    FROM dbo.printform_jobs
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `);

  if (pending.recordset.length > 0) {
    console.log(`  ${DIM}Job yang masih menahan:${RESET}`);
    for (const j of pending.recordset) {
      const left = j.minutes_left > 0
        ? `kedaluwarsa dalam ${j.minutes_left} menit`
        : 'sudah lewat, menunggu disapu cron (tiap 5 menit)';
      console.log(`    ${DIM}${j.job_id}  ${left}${RESET}`);
    }
    console.log(`  ${DIM}Untuk melepas sekarang juga:${RESET}`);
    console.log(`    ${DIM}UPDATE dbo.printform_jobs SET expires_at = GETDATE() WHERE status = 'pending';${RESET}`);
    console.log(`    ${DIM}lalu tunggu satu siklus cron, atau restart backend.${RESET}`);
  }
}

/**
 * Puppeteer merender halaman pratinjau jadi PDF di SISI SERVER — itu sebabnya
 * Chrome headless tetap dibutuhkan meski print preview browser sudah diganti
 * printForm. Tanpa Chrome, job dibuat lalu langsung gagal di langkah render.
 *
 * Versi Chrome yang dicari terikat pada versi Puppeteer yang terpasang. Menaikkan
 * Puppeteer tanpa mengunduh Chrome-nya yang baru akan memunculkan kegagalan yang
 * persis sama, jadi versi keduanya ikut dicetak di sini.
 */
function checkChrome() {
  let puppeteer;
  let installedVersion = '?';
  try {
    puppeteer = require('puppeteer');
    installedVersion = require('puppeteer/package.json').version;
  } catch (err) {
    console.log(`\n  ${RED}TIDAK ADA${RESET}  puppeteer`);
    console.log(`             ${DIM}${err.message.split('\n')[0]}${RESET}`);
    return 1;
  }

  let exePath;
  try {
    exePath = puppeteer.executablePath();
  } catch (err) {
    console.log(`\n  ${RED}TIDAK ADA${RESET}  Chrome untuk puppeteer ${installedVersion}`);
    console.log(`             ${DIM}${err.message.split('\n')[0]}${RESET}`);
    console.log(`             ${DIM}jalankan: npx puppeteer browsers install chrome${RESET}`);
    return 1;
  }

  if (!fs.existsSync(exePath)) {
    console.log(`\n  ${RED}TIDAK ADA${RESET}  Chrome untuk puppeteer ${installedVersion}`);
    console.log(`             ${DIM}dicari di: ${exePath}${RESET}`);
    console.log(`             ${DIM}jalankan: npx puppeteer browsers install chrome${RESET}`);
    return 1;
  }

  console.log(`\n  ${GREEN}OK${RESET}         Chrome untuk puppeteer ${installedVersion}`);
  console.log(`             ${DIM}${exePath}${RESET}`);

  // Peringatan, bukan kegagalan: aplikasi tetap jalan dengan versi yang ada di
  // node_modules. Tapi `npm install` berikutnya akan menaikkannya dan memutus
  // pasangan Chrome-nya — lebih baik diketahui sekarang daripada saat cetak gagal.
  try {
    const declared = require('./package.json').dependencies.puppeteer;
    const bare = String(declared).replace(/^[\^~]/, '');
    if (bare.split('.')[0] !== installedVersion.split('.')[0]) {
      console.log(`\n  ${YELLOW}PERINGATAN${RESET} package.json meminta puppeteer ${declared}, terpasang ${installedVersion}.`);
      console.log(`             ${DIM}npm install akan menaikkannya, dan Chrome yang sekarang tidak akan cocok lagi.${RESET}`);
      console.log(`             ${DIM}Setelah naik versi, jalankan ulang: npx puppeteer browsers install chrome${RESET}`);
    }
  } catch { /* package.json tidak terbaca; bukan alasan menggagalkan pemeriksaan */ }

  return 0;
}

main().catch((err) => {
  console.error('\n  Gagal memeriksa:', err.message, '\n');
  process.exit(1);
});
