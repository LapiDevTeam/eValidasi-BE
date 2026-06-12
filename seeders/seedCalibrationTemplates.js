'use strict';

require('dotenv').config();
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

const TEMPLATES = [
  {
    template_code: 'PA_NEGATIVE_60_TO_60',
    template_name: 'PA -60 to 60',
    unit_mode: 'PA',
    points: [-60, -40, -20, 0, 20, 40, 60],
  },
  {
    template_code: 'PA_0_TO_60',
    template_name: 'PA 0 to 60',
    unit_mode: 'PA',
    points: [0, 10, 20, 30, 40, 50, 60],
  },
  {
    template_code: 'BAR_0_TO_10',
    template_name: 'BAR 0 to 10',
    unit_mode: 'BAR',
    points: [0, 2, 4, 6, 8, 10],
  },
];

async function upsertTemplate(transaction, template) {
  const findRequest = new sql.Request(transaction);
  const found = await findRequest
    .input('TemplateCode', sql.VarChar(100), template.template_code)
    .query(`
      SELECT template_id
      FROM [dbo].[calibration_point_templates]
      WHERE template_code = @TemplateCode
    `);

  let templateId;
  if (found.recordset.length) {
    templateId = found.recordset[0].template_id;
    await new sql.Request(transaction)
      .input('TemplateId', sql.Int, templateId)
      .input('TemplateName', sql.VarChar(255), template.template_name)
      .input('UnitMode', sql.VarChar(20), template.unit_mode)
      .query(`
        UPDATE [dbo].[calibration_point_templates]
        SET template_name = @TemplateName, unit_mode = @UnitMode
        WHERE template_id = @TemplateId
      `);
  } else {
    const inserted = await new sql.Request(transaction)
      .input('TemplateCode', sql.VarChar(100), template.template_code)
      .input('TemplateName', sql.VarChar(255), template.template_name)
      .input('UnitMode', sql.VarChar(20), template.unit_mode)
      .query(`
        INSERT INTO [dbo].[calibration_point_templates]
        (template_code, template_name, unit_mode)
        OUTPUT INSERTED.template_id
        VALUES (@TemplateCode, @TemplateName, @UnitMode)
      `);
    templateId = inserted.recordset[0].template_id;
  }

  await new sql.Request(transaction)
    .input('TemplateId', sql.Int, templateId)
    .query('DELETE FROM [dbo].[calibration_point_template_items] WHERE template_id = @TemplateId');

  for (let i = 0; i < template.points.length; i += 1) {
    await new sql.Request(transaction)
      .input('TemplateId', sql.Int, templateId)
      .input('PointOrder', sql.Int, i + 1)
      .input('NominalValue', sql.Decimal(18, 10), template.points[i])
      .query(`
        INSERT INTO [dbo].[calibration_point_template_items]
        (template_id, point_order, nominal_value)
        VALUES (@TemplateId, @PointOrder, @NominalValue)
      `);
  }
}

async function seed() {
  let pool;
  let transaction;

  try {
    pool = await sql.connect(configMssql);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const template of TEMPLATES) {
      await upsertTemplate(transaction, template);
    }

    await transaction.commit();
    console.log('[seedCalibrationTemplates] done');
  } catch (error) {
    console.error('[seedCalibrationTemplates] failed:', error.message);
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

