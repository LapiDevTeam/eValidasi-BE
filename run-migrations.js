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

const migrationOrder = [
  'create-print-tables.sql',
  'create-calibration-risk-assessment.sql',
  'create-pressure-calibration-tables.sql',
  'create-calibration-workbook-tables.sql',
  'create-timer-calibration-tables.sql',
  'add-reject-remark-to-kalibrasi-permohonan.sql',
  'drop-identitas-alat-from-calibration-sessions.sql',
  'add-justifikasi-to-calibration-risk-assessment.sql',
  'add-da-columns-to-calibration-risk-assessment.sql',
  'add-manual-uncertainties-to-calibration-sessions.sql',
  'add-indicator-resolution-to-calibration-sessions.sql',
  'add-permohonan-fk-to-calibration-risk-assessment.sql',
  'add-columns-to-calibration-standards.sql',
  'fix-sertifikat-bagian-history-triggers.sql',
  'full-calibration-risk-assessment.sql',
];

async function runMigrations() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Connected to SQL Server');
    console.log(`Database: ${config.database}`);
    console.log(`Server: ${config.server}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const migrationFile of migrationOrder) {
      const filePath = path.join(__dirname, 'migrations', migrationFile);

      if (!fs.existsSync(filePath)) {
        console.log(`✗ SKIP: ${migrationFile} (file not found)`);
        continue;
      }

      try {
        const sql_content = fs.readFileSync(filePath, 'utf-8');
        console.log(`Executing: ${migrationFile}...`);

        // Split by GO statements for SQL Server batch execution
        const batches = sql_content
          .split(/^\s*GO\s*$/gim)
          .map((batch) => batch.trim())
          .filter((batch) => batch.length > 0);

        for (const batch of batches) {
          await pool.request().batch(batch);
        }

        console.log(`✓ SUCCESS: ${migrationFile}\n`);
        successCount++;
      } catch (error) {
        console.error(`✗ ERROR in ${migrationFile}:`);
        console.error(`  ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Migration Summary:`);
    console.log(`✓ Successful: ${successCount}`);
    console.log(`✗ Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Connection Error:', error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

runMigrations();
