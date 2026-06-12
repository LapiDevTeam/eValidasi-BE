'use strict';

/**
 * Creates the thermohygrometer workbook session tables used by:
 *   GET /thermohygrometer-calibration/sessions
 *   GET /thermohygrometer-calibration/sessions/:sessionId
 *
 * Run from eValidasi-BE:
 *   node seeders/createThermohygrometerCalibrationTables.js
 */

const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { configMssql } = require('../config/configMssql');

const SQL_FILE = path.resolve(
  __dirname,
  '../sql/create-thermohygrometer-calibration-tables.sql'
);

function splitSqlBatches(script) {
  return script
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function run() {
  let pool;
  let transaction;

  try {
    if (!fs.existsSync(SQL_FILE)) {
      throw new Error(`SQL file not found: ${SQL_FILE}`);
    }

    const script = fs.readFileSync(SQL_FILE, 'utf8');
    const batches = splitSqlBatches(script);

    if (!batches.length) {
      throw new Error('No SQL batches found.');
    }

    pool = await sql.connect(configMssql);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (let index = 0; index < batches.length; index += 1) {
      const request = new sql.Request(transaction);
      request.timeout = 600000;
      await request.batch(batches[index]);
      console.log(
        `[createThermohygrometerCalibrationTables] batch ${index + 1}/${batches.length} done`
      );
    }

    await transaction.commit();
    console.log('[createThermohygrometerCalibrationTables] done');
  } catch (error) {
    console.error('[createThermohygrometerCalibrationTables] failed:', error.message);

    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback failure
      }
    }

    process.exitCode = 1;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (_) {
        // ignore close failure
      }
    }
  }
}

run();
