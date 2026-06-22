'use strict';

/**
 * Tiny ad-hoc migration runner.
 *   node run-migration.js migrations/create-timer-calibration-tables.sql
 *
 * Splits the file on standalone `GO` batch separators and executes each batch
 * sequentially using the project's existing MSSQL connection config.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { configMssql } = require('./config/configMssql');

async function main() {
  const relPath = process.argv[2];
  if (!relPath) {
    console.error('Usage: node run-migration.js <path-to-sql-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(__dirname, relPath);
  const raw = fs.readFileSync(fullPath, 'utf8');

  // Split on lines that contain only GO (case-insensitive), trimming BOM.
  const batches = raw
    .replace(/^﻿/, '')
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const pool = await sql.connect(configMssql);
  console.log(`Connected. Running ${batches.length} batch(es) from ${relPath}`);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    try {
      await pool.request().batch(batch);
      console.log(`  [${i + 1}/${batches.length}] OK`);
    } catch (err) {
      console.error(`  [${i + 1}/${batches.length}] FAILED:`, err.message);
      console.error('  --- batch ---\n' + batch.slice(0, 500));
      throw err;
    }
  }

  console.log('Migration complete.');
  await pool.close();
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
