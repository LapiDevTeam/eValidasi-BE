const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { Sequelize } = require('../models');
const moment = require('moment');
const crypto = require('crypto');

/**
 * Get current date in format YYYY-MM-DD
 * VBA equivalent: Get_Date()
 */
const getDate = () => {
  return moment().format('YYYY-MM-DD');
};

/**
 * Get current date and time in format YYYY-MM-DD HH:mm:ss
 * VBA equivalent: Get_DateTime()
 */
const getDateTime = () => {
  return moment().format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Get employee name by user ID
 * VBA equivalent: Get_EmployeeName / fnGetNamaKaryawan
 */
const getEmployeeName = async (userId) => {
  try {
    const query = `SELECT dbo.fnGetNamaKaryawan(:userId) as nama`;
    const result = await sequelizeMSQL.query(query, {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.nama || '';
  } catch (error) {
    console.error('Error in getEmployeeName:', error);
    return '';
  }
};

/**
 * Get token for user authentication
 * VBA equivalent: getToken from global-helper.vba
 */
const getToken = async (userId) => {
  try {
    const query = `SELECT dbo.[fnGetToken](:userId) as token`;
    const result = await sequelizeMSQL.query(query, {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.token || '';
  } catch (error) {
    console.error('Error in getToken:', error);
    return '';
  }
};

/**
 * Format date for SQL query
 * VBA equivalent: fnSetDate
 */
const formatDateForSQL = (dateString) => {
  if (!dateString || dateString === '') {
    return null;
  }
  try {
    return moment(dateString).format('YYYY-MM-DD');
  } catch (error) {
    return null;
  }
};

/**
 * Get Approver Identity
 * VBA equivalent: fnApprIdentity
 */
const getApproverIdentity = async (approverId, approverNo, applicationCode = 'KAL_Sert_Thermo') => {
  try {
    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :applicationCode
        AND Appr_ID = :approverId
        AND Appr_No = :approverNo
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { approverId, approverNo, applicationCode },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.Appr_Identity || 0;
  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    return 0;
  }
};

/**
 * Get Auto Sequence ID for Suhu data
 * VBA equivalent: fnGetAuto_SuhuID
 */
const getAutoSuhuID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoSuhuID:', error);
    return 1;
  }
};

/**
 * Get Auto Sequence ID for Kelembaban data
 * VBA equivalent: fnGetAuto_KelembabanID
 */
const getAutoKelembabanID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumKelembaban
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumKelembaban || 1;
  } catch (error) {
    console.error('Error in getAutoKelembabanID:', error);
    return 1;
  }
};

module.exports = {
  getDate,
  getDateTime,
  getEmployeeName,
  getToken,
  formatDateForSQL,
  getApproverIdentity,
  getAutoSuhuID,
  getAutoKelembabanID
};
