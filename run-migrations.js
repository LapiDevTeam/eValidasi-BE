require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const config = {
  user: process.env.MS_SQL_DB_USER,
  password: process.env.MS_SQL_DB_PWD,
  server: process.env.MS_SQL_DB_SERVER,
  database: process.env.MS_SQL_DB_NAME,
  authentication: {
    type: 'default',
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  },
};

// One-time migration runner for eValidasi testing/blank databases.
// Pressure calibration is hidden/unused, so pressure-only migrations are excluded.
const migrationOrder = [
  // ---------------------------------------------------------------------------
  // Base schema creation
  // ---------------------------------------------------------------------------
  { dir: 'migrations', file: 'create-print-tables.sql' },
  { dir: 'migrations', file: 'create-calibration-risk-assessment.sql' },
  { dir: 'migrations', file: 'create-calibration-workbook-tables.sql' },
  { dir: 'migrations', file: 'create-timer-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-timbangan-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-disintegration-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-rpm-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-tapped-volumeter-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-temperature-calibration-tables.sql' },
  { dir: 'migrations', file: 'create-timbangan-at-master.sql' },
  { dir: 'migrations', file: 'create-or-alter-logging-mike.sql' },

  // sql/ module tables (not hidden)
  { dir: 'sql', file: 'create-thermohygrometer-calibration-tables.sql' },
  { dir: 'sql', file: 'create-dissolution-tester-calibration-tables.sql' },
  { dir: 'sql', file: 'create-friability-calibration-tables.sql' },
  { dir: 'sql', file: 'create-leak-test-calibration-tables.sql' },
  { dir: 'sql', file: 'create-moisture-calibration-tables.sql' },
  { dir: 'sql', file: 'create-hardness-tester-calibration-tables.sql' },
  { dir: 'sql', file: 'create-enclosures-calibration-tables.sql' },
  { dir: 'sql', file: 'create-temperature-control-calibration-tables.sql' },
  { dir: 'sql', file: 'create-torque-meter-calibration-tables.sql' },

  // Monthly schedule & AWP must exist before Kalibrasi Eksternal (FK dependency)
  { dir: 'sql', file: 'create-monthly-schedule-tables.sql' },
  { dir: 'sql', file: 'create-awp-snapshot-tables.sql' },

  // Kalibrasi Eksternal depends on T_Monthly_Schedule_External_Detail
  { dir: 'migrations', file: 'create-kalibrasi-eksternal-tables.sql' },

  // ---------------------------------------------------------------------------
  // Column additions & patches
  // ---------------------------------------------------------------------------
  { dir: 'migrations', file: 'add-evaluation-result-to-calibration-workbook.sql' },
  { dir: 'migrations', file: 'add-timer-evaluation-result.sql' },
  { dir: 'migrations', file: 'add-timbangan-evaluation-result.sql' },
  { dir: 'migrations', file: 'add-evaluation-result-remaining.sql' },
  { dir: 'migrations', file: 'add-approval-columns-to-calibration-sessions.sql' },
  { dir: 'migrations', file: 'add-calibration-workbook-approval-columns.sql' },
  { dir: 'migrations', file: 'add-disintegration-approval-columns.sql' },
  { dir: 'migrations', file: 'add-rejected-columns-to-workbook-session-tables.sql' },
  { dir: 'migrations', file: 'add-eccentricity-nominal-mass-timbangan.sql' },
  { dir: 'migrations', file: 'add-timer-point-resolution.sql' },

  // Risk assessment patches
  { dir: 'migrations', file: 'add-da-columns-to-calibration-risk-assessment.sql' },
  { dir: 'migrations', file: 'add-justifikasi-to-calibration-risk-assessment.sql' },
  { dir: 'migrations', file: 'add-keterangan-khusus-to-calibration-risk-assessment.sql' },
  { dir: 'migrations', file: 'add-permohonan-fk-to-calibration-risk-assessment.sql' },

  // Legacy permohonan patches (reject_remark + interval_bulan)
  { dir: 'migrations', file: 'drop-identitas-alat-from-calibration-sessions.sql' },
  { dir: 'migrations', file: 'add-reject-remark-to-kalibrasi-permohonan.sql' },
  { dir: 'migrations', file: 'add-reject-remark-to-permohonan-hist.sql' },
  { dir: 'migrations', file: 'add-interval-bulan-to-kalibrasi-permohonan.sql' },
  { dir: 'migrations', file: 'increase-lokasi-column-size-permohonan.sql' },

  // Sertifikat Bagian reject_remark must exist before gap4 / trigger rebuilds
  { dir: 'migrations', file: 'add-reject-remark-to-sertifikat-bagian.sql' },

  // gap4 adds label_tempel_by etc.; must run before OOC/label-date migrations
  { dir: 'migrations', file: 'gap4-tidak-dapat-internal.sql' },

  // Certificate / DA OOC & label date patches (rebuild triggers)
  { dir: 'migrations', file: 'add-tanggal-label-ooc-to-da-and-sertifikat.sql' },
  { dir: 'migrations', file: 'add-ooc-flag-to-sertifikat.sql' },
  { dir: 'migrations', file: 'add-ooc-flag-to-sertifikat-thermohygro.sql' },

  // ---------------------------------------------------------------------------
  // Audit-trail / _hist tables
  // ---------------------------------------------------------------------------
  // Note: add-pressure-calibration-sessions-hist is kept because it creates a
  // trigger on calibration_sessions (now owned by the workbook module) and is
  // required by add-new-cohort-calibration-audit-trail.sql.
  { dir: 'migrations', file: 'add-pressure-calibration-sessions-hist.sql' },
  { dir: 'migrations', file: 'add-timer-timbangan-sessions-hist.sql' },
  { dir: 'migrations', file: 'add-new-cohort-calibration-audit-trail.sql' },
  { dir: 'migrations', file: 'add-kalibrasi-eksternal-audit-trail.sql' },

  // ---------------------------------------------------------------------------
  // Trigger fixes & gap fixes
  // ---------------------------------------------------------------------------
  { dir: 'migrations', file: 'fix-sertifikat-bagian-history-triggers.sql' },
  { dir: 'migrations', file: 'fix-da-bagian-history-triggers.sql' },
  { dir: 'migrations', file: 'fix-da-timbangan-hist-column-order.sql' },
  { dir: 'migrations', file: 'fix-certificate-number-single-prefix-functions.sql' },

  // gap3: label_tempel_by must exist before check constraint references it
  { dir: 'migrations', file: 'gap3-tidak-dapat-label-tempel.sql' },
  { dir: 'migrations', file: 'gap3-fix-status-check-constraint.sql' },

  // Status TIDAK_DAPAT_REJECTED (penolakan MGR pada alur unit tidak siap)
  { dir: 'migrations', file: 'add-tidak-dapat-rejected-status.sql' },

  // ---------------------------------------------------------------------------
  // Triggers (must run after their base tables)
  // ---------------------------------------------------------------------------
  { dir: 'sql', file: 'create-monthly-schedule-triggers.sql' },
  { dir: 'sql', file: 'create-awp-snapshot-triggers.sql' },
];

// Verification checklist: expected tables and key columns.
const expectedTables = [
  'print_jobs',
  'printer_profiles',
  'RA_CalibrationAssessment',
  'calibration_sessions',
  'calibration_nominal_points',
  'calibration_readings',
  'calibration_results',
  'calibration_result_summary',
  'calibration_uncertainty_inputs',
  'timer_sessions',
  'timer_points',
  'timer_sessions_hist',
  'timbangan_sessions',
  'timbangan_preadjust_rows',
  'timbangan_sessions_hist',
  'disintegration_sessions',
  'disintegration_sessions_hist',
  'rpm_sessions',
  'rpm_sessions_hist',
  'tapped_volumeter_sessions',
  'tapped_volumeter_sessions_hist',
  'temperature_sessions',
  'temperature_sessions_hist',
  'T_Kalibrasi_Master_Vendor',
  'T_Kalibrasi_Eksternal',
  'T_Kalibrasi_Eksternal_Status',
  'timbangan_at_standards',
  'timbangan_config',
  'T_Kalibrasi_Thermohygro_Workbook_Session',
  'T_Kalibrasi_DissolutionTester_Workbook_Session',
  'T_Kalibrasi_Friability_Workbook_Session',
  'T_Kalibrasi_LeakTest_Workbook_Session',
  'T_Kalibrasi_Moisture_Workbook_Session',
  'T_Kalibrasi_HardnessTester_Workbook_Session',
  'T_Kalibrasi_Enclosures_Workbook_Session',
  'T_Kalibrasi_TemperatureControl_Workbook_Session',
  'T_Kalibrasi_TorqueMeter_Workbook_Session',
  'T_Monthly_Schedule_Header',
  'T_Monthly_Schedule_External_Header',
  'T_AWP_Header',
  'calibration_sessions_hist',
];

const expectedColumns = [
  { table: 'T_Kalibrasi_Permohonan', column: 'interval_bulan' },
  { table: 'T_Kalibrasi_Permohonan', column: 'reject_remark' },
  { table: 'T_Kalibrasi_Permohonan_Hist', column: 'interval_bulan' },
  { table: 'T_Kalibrasi_Permohonan_Hist', column: 'reject_remark' },
  { table: 'calibration_sessions', column: 'evaluation_result' },
  { table: 'calibration_sessions', column: 'approved_by_admin' },
  { table: 'calibration_sessions', column: 'rejected_by' },
  { table: 'timer_sessions', column: 'evaluation_result' },
  { table: 'timer_sessions', column: 'approved_by_admin' },
  { table: 'timbangan_sessions', column: 'evaluation_result' },
  { table: 'timbangan_sessions', column: 'approved_by_admin' },
  { table: 'T_Kalibrasi_Sertifikat_Bagian', column: 'is_ooc' },
  { table: 'T_Kalibrasi_Sertifikat_Bagian', column: 'label_tempel_by' },
  { table: 'T_Kalibrasi_Sertifikat_Bagian', column: 'reject_remark' },
  { table: 'T_Kalibrasi_Sertifikat_Timbangan', column: 'is_ooc' },
  { table: 'T_Kalibrasi_Sertifikat_Timbangan', column: 'label_tempel_by' },
  { table: 'T_Kalibrasi_Sertifikat_Thermohygro', column: 'is_ooc' },
  { table: 'T_Kalibrasi_Sertifikat_Thermohygro', column: 'label_tempel_by' },
];

async function runMigrations() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('Connected to SQL Server');
    console.log(`Database: ${config.database}`);
    console.log(`Server: ${config.server}\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const migration of migrationOrder) {
      const migrationFile = migration.file;
      const dir = migration.dir;
      const filePath = path.join(__dirname, dir, migrationFile);

      if (!fs.existsSync(filePath)) {
        console.log(`SKIP: ${dir}/${migrationFile} (file not found)`);
        continue;
      }

      try {
        const sqlContent = fs.readFileSync(filePath, 'utf-8');
        process.stdout.write(`Executing: ${dir}/${migrationFile} ... `);

        const batches = sqlContent
          .replace(/^\uFEFF/, '')
          .split(/^\s*GO\s*$/gim)
          .map((batch) => batch.trim())
          .filter((batch) => batch.length > 0);

        for (let i = 0; i < batches.length; i += 1) {
          const request = pool.request();
          request.timeout = 120000; // 2 minutes for large trigger rebuilds
          await request.batch(batches[i]);
        }

        console.log('OK');
        successCount += 1;
      } catch (error) {
        console.log('FAILED');
        console.error(`  ${error.message}`);
        errorCount += 1;
        errors.push({ file: `${dir}/${migrationFile}`, message: error.message });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('Migration Summary:');
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed:     ${errorCount}`);
    console.log('='.repeat(70));

    if (errorCount > 0) {
      console.log('\nFailed migrations:');
      errors.forEach((e) => console.log(`  - ${e.file}: ${e.message}`));
    }

    // -------------------------------------------------------------------------
    // Verification step
    // -------------------------------------------------------------------------
    console.log('\nVerifying expected tables...');
    const missingTables = [];
    for (const tableName of expectedTables) {
      const result = await pool.request().query(`
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = '${tableName}'
      `);
      if (result.recordset[0].cnt === 0) {
        missingTables.push(tableName);
      }
    }

    console.log('Verifying expected columns...');
    const missingColumns = [];
    for (const { table, column } of expectedColumns) {
      const result = await pool.request().query(`
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
      `);
      if (result.recordset[0].cnt === 0) {
        missingColumns.push(`${table}.${column}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('Verification Summary:');
    console.log(`  Expected tables:  ${expectedTables.length - missingTables.length}/${expectedTables.length}`);
    console.log(`  Expected columns: ${expectedColumns.length - missingColumns.length}/${expectedColumns.length}`);

    if (missingTables.length > 0) {
      console.log('\nMissing tables:');
      missingTables.forEach((t) => console.log(`  - ${t}`));
    }
    if (missingColumns.length > 0) {
      console.log('\nMissing columns:');
      missingColumns.forEach((c) => console.log(`  - ${c}`));
    }
    console.log('='.repeat(70));

    if (errorCount > 0 || missingTables.length > 0 || missingColumns.length > 0) {
      process.exitCode = 1;
    } else {
      console.log('\nAll migrations executed and verified successfully.');
    }
  } catch (error) {
    console.error('Connection or fatal error:', error);
    process.exitCode = 1;
  } finally {
    await pool.close();
  }
}

runMigrations();
