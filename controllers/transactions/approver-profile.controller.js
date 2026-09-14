'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

function normalizeUserIds(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim());

  return [...new Set(values.filter(Boolean))].slice(0, 50);
}

const listApproverProfiles = async (req, res, next) => {
  try {
    const userIds = normalizeUserIds(
      req.query.user_ids || req.query.userIds || req.query.user_id || req.query.userId
    );

    if (!userIds.length) {
      return res.status(200).json({
        success: true,
        data: [],
        map: {},
      });
    }

    const replacements = {};
    const placeholders = userIds.map((userId, index) => {
      const key = `userId${index}`;
      replacements[key] = userId;
      return `:${key}`;
    });

    const rows = await sequelizeMSQL.query(
      `
        SELECT
          a.emp_NIK,
          a.emp_Name,
          b.Jabatan
        FROM m_employee AS a
        LEFT JOIN m_karyawan AS b
          ON a.emp_Name = b.Nama
        WHERE a.emp_NIK IN (${placeholders.join(', ')})
      `,
      {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    const map = rows.reduce((acc, row) => {
      const key = String(row.emp_NIK || '').trim().toUpperCase();
      if (key) acc[key] = row;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: rows,
      map,
    });
  } catch (error) {
    console.error('Error in listApproverProfiles:', error);
    next(error);
  }
};

module.exports = {
  listApproverProfiles,
};
