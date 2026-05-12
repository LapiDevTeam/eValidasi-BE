'use strict';

/**
 * seedCalibrationStandards.js
 *
 * Seeder for the MASTER STANDARD sheet from the Excel workbook
 * "Perhitungan Tekanan.xls".
 *
 * PURPOSE
 * -------
 * Populates calibration_standards and calibration_standard_points with the
 * reference instrument metadata and certificate correction lookup tables.
 *
 * The backend formula engine uses these points to correct raw standard readings
 * via piecewise linear interpolation:
 *
 *   For each pair of adjacent certificate points (sorted by actual_pressure):
 *     slope              = (y2 - y1) / (x2 - x1)   // x = indicator, y = actual
 *     intercept          = y1 - slope * x1
 *     correctedStandard  = slope * rawStandardReading + intercept
 *
 * IMPORTANT: Calculation code must always use the standard_id from the
 *            calibration session record - never hardcode an ID.
 *
 * IDEMPOTENT BEHAVIOUR
 * --------------------
 *   - standard_code already exists -> UPDATE header, preserve standard_id.
 *   - standard_code not found      -> INSERT, capture new standard_id.
 *   - Points are always deleted + reinserted to stay in sync with seed data.
 *
 * PREREQUISITE
 * ------------
 *   Run migrations/add-columns-to-calibration-standards.sql first to ensure
 *   the new columns (no_id, recalibration_date_text, brand_type, serial_number,
 *   is_active, updated_at, point_order) exist in the database.
 *
 * Run:
 *   npm run seed:calibration-standards
 *
 * Target tables: calibration_standards, calibration_standard_points
 * Compatible with SQL Server 2008+.
 */

require('dotenv').config();
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

// =============================================================================
// SEED DATA  (MASTER STANDARD sheet -- Perhitungan Tekanan.xls)
// =============================================================================
// Each entry: standard header + points[]
//   points[] used as the active correction table for this standard.
//
// TODO (future): Support multiple certificate profiles per standard so that
//   both the "active calibration sheet" points and the original "MASTER STANDARD
//   certificate" points can coexist under the same standard_id.  The current
//   schema supports only one point set per standard_id.
// =============================================================================

const STANDARDS = [

  // ---------------------------------------------------------------------------
  // Standard Code "83"
  // Reference: VN 083, Additel ADT6810-10-GP300-BAR-N
  // Active calibration sheet: "0 sd 600 Pa (750 Pa)"
  // ---------------------------------------------------------------------------
  {
    standard_code:           '83',
    no_id:                   'VN 083, VN 037',
    standard_name:           'Digital Pressure Gauge, Mistar Baja',
    certificate_no:          'CE00127 , S.23 008 384',
    traceability:            'CERTUS , KALIMAN',
    recalibration_date_text: 'Feb 27, Jun 27',
    brand_type:              'Additel /ADT6810-10-GP300-BAR-N, Kenko/NA',
    serial_number:           '21817100035, NA',
    unit:                    'Bar',

    // Active calibration sheet points: "0 sd 600 Pa (750 Pa)"
    points: [
      { actual_pressure: 0,    indicator_increasing: 0,        indicator_decreasing: 0.00003,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 0.25, indicator_increasing: 0.25014,  indicator_decreasing: 0.25014,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 0.5,  indicator_increasing: 0.50032,  indicator_decreasing: 0.50033,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 1,    indicator_increasing: 1.00068,  indicator_decreasing: 1.00070,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 1.5,  indicator_increasing: 1.50104,  indicator_decreasing: 1.50107,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 2,    indicator_increasing: 2.00142,  indicator_decreasing: 2.00144,  uncertainty: null, unit: 'Bar' },
      { actual_pressure: 2.5,  indicator_increasing: 2.50178,  indicator_decreasing: 2.50178,  uncertainty: null, unit: 'Bar' },
    ],

    // TODO (future certificate profile): VN083 original MASTER STANDARD certificate points.
    // Once multi-profile support is added to the schema, store these in a separate profile:
    //   { actual_pressure: 0,  indicator_increasing: 0,      indicator_decreasing: 0,      uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 2,  indicator_increasing: 1.999,  indicator_decreasing: 1.999,  uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 4,  indicator_increasing: 3.998,  indicator_decreasing: 3.998,  uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 8,  indicator_increasing: 7.995,  indicator_decreasing: 7.995,  uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 12, indicator_increasing: 11.992, indicator_decreasing: 11.992, uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 16, indicator_increasing: 15.990, indicator_decreasing: 15.989, uncertainty: 0.003, unit: 'Bar' },
    //   { actual_pressure: 20, indicator_increasing: 19.986, indicator_decreasing: 19.986, uncertainty: 0.003, unit: 'Bar' },
  },

  // ---------------------------------------------------------------------------
  // Standard Code "84"
  // Reference: VN 084, Additel 760 / ADT155-CP35-760
  // ---------------------------------------------------------------------------
  {
    standard_code:           '84',
    no_id:                   'VN 084, VN 084-CP, VN 037',
    standard_name:           'Auto.Handheld Pressure Cal, Mistar Baja',
    certificate_no:          'CE00088 , S.23 008 384',
    traceability:            'CERTUS , KALIMAN',
    recalibration_date_text: 'Jan 28, Jun 27',
    brand_type:              'Additel 760/ADT155-CP35-760, Kenko/ NA',
    serial_number:           '00516600005, NA',
    unit:                    'Bar',

    // VN084 certificate correction points from MASTER STANDARD sheet
    points: [
      { actual_pressure: 0,     indicator_increasing: 0,         indicator_decreasing: -0.00007, uncertainty: 0.00024, unit: 'Bar' },
      { actual_pressure: -0.1,  indicator_increasing: -0.10007,  indicator_decreasing: -0.10006, uncertainty: 0.00024, unit: 'Bar' },
      { actual_pressure: -0.2,  indicator_increasing: -0.20014,  indicator_decreasing: -0.20015, uncertainty: 0.00024, unit: 'Bar' },
      { actual_pressure: -0.4,  indicator_increasing: -0.40029,  indicator_decreasing: -0.40030, uncertainty: 0.00024, unit: 'Bar' },
      { actual_pressure: -0.6,  indicator_increasing: -0.60042,  indicator_decreasing: -0.60045, uncertainty: 0.00024, unit: 'Bar' },
      { actual_pressure: -0.85, indicator_increasing: -0.85059,  indicator_decreasing: -0.85059, uncertainty: 0.00024, unit: 'Bar' },
    ],
  },

  // ---------------------------------------------------------------------------
  // Standard Code "84-CP"
  // Reference: VN 084-CP (CP module variant of VN 084)
  // ---------------------------------------------------------------------------
  {
    standard_code:           '84-CP',
    no_id:                   'VN 084-CP, VN 037',
    standard_name:           'Auto.Handheld Pressure Cal, Mistar Baja',
    certificate_no:          'CE00088 , S.23 008 384',
    traceability:            'CERTUS , KALIMAN',
    recalibration_date_text: 'Jan 28, Jun 27',
    brand_type:              'Additel 760/ADT155-CP35-760, Kenko/ NA',
    serial_number:           '00516600005, NA',
    unit:                    'Bar',

    // TODO: Add specific correction points for the 84-CP module once the
    //   certificate data for the ADT155-CP35-760 CP module is available.
    points: [],
  },

  // ---------------------------------------------------------------------------
  // Standard Code "112"
  // Reference: VN 112-CP, Additel 760 / ADT155-CP35-760
  // ---------------------------------------------------------------------------
  {
    standard_code:           '112',
    no_id:                   'VN 112-CP, VN 037',
    standard_name:           'Auto.Handheld Pressure Cal, Mistar Baja',
    certificate_no:          'CE00609, S.23 008 384',
    traceability:            'CERTUS , KALIMAN',
    recalibration_date_text: 'Jul 26, Jun 27',
    brand_type:              'Additel 760/ADT155-CP35-760, Kenko/NA',
    serial_number:           '005173D0036, -',
    unit:                    'Bar',

    // TODO: Add correction points for Standard 112 once CE00609 certificate
    //   data is available.
    points: [],
  },

];

// =============================================================================
// SEEDER LOGIC
// =============================================================================

async function seed() {
  let pool;
  let transaction;

  try {
    pool = await sql.connect(configMssql);
    console.log('[seed] Connected to database.');

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('[seed] Transaction started.');

    for (const std of STANDARDS) {
      // -----------------------------------------------------------------------
      // 1. Check if standard already exists by standard_code
      // -----------------------------------------------------------------------
      const checkResult = await new sql.Request(transaction)
        .input('StandardCode', sql.VarChar(50), std.standard_code)
        .query(`
          SELECT standard_id
          FROM [dbo].[calibration_standards]
          WHERE standard_code = @StandardCode
        `);

      let standardId;

      if (checkResult.recordset.length > 0) {
        // -------------------------------------------------------------------
        // 2a. Standard EXISTS -> UPDATE header
        // -------------------------------------------------------------------
        standardId = checkResult.recordset[0].standard_id;

        await new sql.Request(transaction)
          .input('StandardId',            sql.Int,          standardId)
          .input('NoId',                  sql.VarChar(255), std.no_id                   || null)
          .input('StandardName',          sql.VarChar(255), std.standard_name)
          .input('CertificateNo',         sql.VarChar(255), std.certificate_no          || null)
          .input('Traceability',          sql.VarChar(255), std.traceability            || null)
          .input('RecalibrationDateText', sql.VarChar(100), std.recalibration_date_text || null)
          .input('BrandType',             sql.VarChar(255), std.brand_type              || null)
          .input('SerialNumber',          sql.VarChar(255), std.serial_number           || null)
          .input('Unit',                  sql.VarChar(20),  std.unit                    || null)
          .query(`
            UPDATE [dbo].[calibration_standards]
            SET
              no_id                   = @NoId,
              standard_name           = @StandardName,
              certificate_no          = @CertificateNo,
              traceability            = @Traceability,
              recalibration_date_text = @RecalibrationDateText,
              brand_type              = @BrandType,
              serial_number           = @SerialNumber,
              unit                    = @Unit,
              updated_at              = GETDATE()
            WHERE standard_id = @StandardId
          `);

        console.log(`[seed] Standard UPDATED  – code="${std.standard_code}"  id=${standardId}`);

      } else {
        // -------------------------------------------------------------------
        // 2b. Standard NOT EXISTS -> INSERT
        // -------------------------------------------------------------------
        const insertResult = await new sql.Request(transaction)
          .input('StandardCode',          sql.VarChar(50),  std.standard_code)
          .input('NoId',                  sql.VarChar(255), std.no_id                   || null)
          .input('StandardName',          sql.VarChar(255), std.standard_name)
          .input('CertificateNo',         sql.VarChar(255), std.certificate_no          || null)
          .input('Traceability',          sql.VarChar(255), std.traceability            || null)
          .input('RecalibrationDateText', sql.VarChar(100), std.recalibration_date_text || null)
          .input('BrandType',             sql.VarChar(255), std.brand_type              || null)
          .input('SerialNumber',          sql.VarChar(255), std.serial_number           || null)
          .input('Unit',                  sql.VarChar(20),  std.unit                    || null)
          .query(`
            INSERT INTO [dbo].[calibration_standards]
              (standard_code, no_id, standard_name, certificate_no, traceability,
               recalibration_date_text, brand_type, serial_number, unit)
            OUTPUT INSERTED.standard_id
            VALUES
              (@StandardCode, @NoId, @StandardName, @CertificateNo, @Traceability,
               @RecalibrationDateText, @BrandType, @SerialNumber, @Unit)
          `);

        standardId = insertResult.recordset[0].standard_id;
        console.log(`[seed] Standard INSERTED – code="${std.standard_code}"  id=${standardId}`);
      }

      // -----------------------------------------------------------------------
      // 3. Delete existing certificate points for this standard, then reinsert
      // -----------------------------------------------------------------------
      const deleteResult = await new sql.Request(transaction)
        .input('StandardId', sql.Int, standardId)
        .query(`
          DELETE FROM [dbo].[calibration_standard_points]
          WHERE standard_id = @StandardId
        `);

      const deletedCount = deleteResult.rowsAffected[0] || 0;
      if (deletedCount > 0) {
        console.log(`[seed]   Points REFRESHED – removed ${deletedCount} old point(s) for id=${standardId}`);
      }

      if (std.points.length === 0) {
        console.log(`[seed]   Points SKIPPED  – no points defined for code="${std.standard_code}" (add later)`);
        continue;
      }

      // -----------------------------------------------------------------------
      // 4. Insert each certificate correction point (point_order = 1-based)
      // -----------------------------------------------------------------------
      for (let i = 0; i < std.points.length; i++) {
        const pt = std.points[i];
        const pointOrder = i + 1;

        await new sql.Request(transaction)
          .input('StandardId',          sql.Int,             standardId)
          .input('ActualPressure',      sql.Decimal(18, 10), pt.actual_pressure)
          .input('IndicatorIncreasing', sql.Decimal(18, 10), pt.indicator_increasing)
          .input('IndicatorDecreasing', sql.Decimal(18, 10), pt.indicator_decreasing)
          .input('Uncertainty',         sql.Decimal(18, 10), pt.uncertainty ?? null)
          .input('Unit',                sql.VarChar(20),     pt.unit || null)
          .input('PointOrder',          sql.Int,             pointOrder)
          .query(`
            INSERT INTO [dbo].[calibration_standard_points]
              (standard_id, actual_pressure, indicator_increasing, indicator_decreasing,
               uncertainty, unit, point_order)
            VALUES
              (@StandardId, @ActualPressure, @IndicatorIncreasing, @IndicatorDecreasing,
               @Uncertainty, @Unit, @PointOrder)
          `);
      }

      console.log(`[seed]   Points INSERTED – ${std.points.length} point(s) for code="${std.standard_code}" id=${standardId}`);
    }

    // -------------------------------------------------------------------------
    // 5. Commit
    // -------------------------------------------------------------------------
    await transaction.commit();
    console.log('[seed] Transaction COMMITTED. Seeding complete.');
    console.log(`[seed] Summary: ${STANDARDS.length} standard(s) processed.`);

  } catch (err) {
    console.error('[seed] ERROR – rolling back transaction:', err.message);
    if (transaction) {
      try {
        await transaction.rollback();
        console.error('[seed] Transaction ROLLED BACK.');
      } catch (rollbackErr) {
        console.error('[seed] Rollback failed:', rollbackErr.message);
      }
    }
    process.exit(1);

  } finally {
    if (pool) {
      try { await pool.close(); } catch (_) {}
    }
  }
}

seed();
