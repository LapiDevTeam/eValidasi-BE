require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

async function run() {
  const file = process.argv[2];
  if (!file) {
    throw new Error('Usage: node tmp/run_sql_file.js <sql-file>');
  }

  const absPath = path.resolve(process.cwd(), file);
  const sqlText = fs.readFileSync(absPath, 'utf8');

  const batches = sqlText
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);

  const pool = await sql.connect(configMssql);
  try {
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      process.stdout.write(`[run_sql_file] Executing batch ${i + 1}/${batches.length}...\n`);
      await pool.request().query(batch);
    }
    process.stdout.write('[run_sql_file] Completed successfully.\n');
  } finally {
    await pool.close();
  }
}

run().catch((err) => {
  console.error('[run_sql_file] Failed:', err && err.message ? err.message : err);
  process.exit(1);
});
