'use strict';

require('dotenv').config();
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

const CONVERSIONS = [
  { from_unit: 'BAR', to_unit: 'PA', factor: 100000 },
  { from_unit: 'PA', to_unit: 'BAR', factor: 0.00001 },
  { from_unit: 'BAR', to_unit: 'MBAR', factor: 1000 },
  { from_unit: 'MBAR', to_unit: 'BAR', factor: 0.001 },
  { from_unit: 'BAR', to_unit: 'KPA', factor: 100 },
  { from_unit: 'KPA', to_unit: 'BAR', factor: 0.01 },
  { from_unit: 'BAR', to_unit: 'MPA', factor: 0.1 },
  { from_unit: 'MPA', to_unit: 'BAR', factor: 10 },
  { from_unit: 'PSI', to_unit: 'BAR', factor: 0.0689475699987085 },
  { from_unit: 'BAR', to_unit: 'PSI', factor: 14.50377439 },
];

async function seed() {
  let pool;
  let transaction;

  try {
    pool = await sql.connect(configMssql);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const row of CONVERSIONS) {
      const request = new sql.Request(transaction);
      await request
        .input('FromUnit', sql.VarChar(20), row.from_unit)
        .input('ToUnit', sql.VarChar(20), row.to_unit)
        .input('Factor', sql.Decimal(24, 12), row.factor)
        .query(`
          IF EXISTS (
            SELECT 1
            FROM [dbo].[pressure_conversion_factors]
            WHERE from_unit = @FromUnit
              AND to_unit = @ToUnit
          )
          BEGIN
            UPDATE [dbo].[pressure_conversion_factors]
            SET factor = @Factor
            WHERE from_unit = @FromUnit
              AND to_unit = @ToUnit
          END
          ELSE
          BEGIN
            INSERT INTO [dbo].[pressure_conversion_factors] (from_unit, to_unit, factor)
            VALUES (@FromUnit, @ToUnit, @Factor)
          END
        `);
    }

    await transaction.commit();
    console.log('[seedPressureConversions] done');
  } catch (error) {
    console.error('[seedPressureConversions] failed:', error.message);
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

seed();

