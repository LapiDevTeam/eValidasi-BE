const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { Sequelize } = require('../models');
const moment = require('moment');
const crypto = require('crypto');

/**
 * Get current date in format YYYY-MM-DD (UTC+7)
 * VBA equivalent: Get_Date()
 */
const getDate = () => {
  return moment().utcOffset(7).format('YYYY-MM-DD');
};

/**
 * Get current date and time in format YYYY-MM-DD HH:mm:ss (UTC+7)
 * VBA equivalent: Get_DateTime()
 */
const getDateTime = () => {
  return moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss');
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

/**
 * Get Auto Sequence ID for Pre-Adjustment data (Timbangan)
 * VBA equivalent: fnGetAuto_Pre_Adj
 */
const getAutoPreAdjID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoPreAdjID:', error);
    return 1;
  }
};

/**
 * Get Auto Sequence ID for Pusat Pan data (Timbangan)
 * VBA equivalent: fnGetAuto_Pusat_Pan
 */
const getAutoPusatPanID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoPusatPanID:', error);
    return 1;
  }
};

/**
 * Get Auto Sequence ID for Daya Ulang data (Timbangan)
 * VBA equivalent: fnGetAuto_KelembabanID from Timbangan
 */
const getAutoDayaUlangID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoDayaUlangID:', error);
    return 1;
  }
};

/**
 * Get Auto Sequence ID for Massa Standard data (Timbangan)
 * VBA equivalent: fnGetAuto_Massa_standar
 */
const getAutoMassaStandardID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoMassaStandardID:', error);
    return 1;
  }
};

/**
 * Check if Tgl Kalibrasi has been input (Timbangan)
 * VBA equivalent: fnIsInputTglKalibrasi
 */
const isInputTglKalibrasiTimbangan = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT Tgl_kalibrasi
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_id = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const tglKalibrasi = result[0]?.Tgl_kalibrasi;
    return tglKalibrasi !== null && tglKalibrasi !== undefined && tglKalibrasi !== '';
  } catch (error) {
    console.error('Error in isInputTglKalibrasiTimbangan:', error);
    return false;
  }
};

/**
 * Check if user is allowed to input (Timbangan)
 * VBA equivalent: fnIsAllowInput
 */
const isAllowInputTimbangan = async (userId) => {
  try {
    const query = `
      SELECT COUNT(*) as jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :userId
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    });
    return parseInt(result[0]?.jumRow || 0);
  } catch (error) {
    console.error('Error in isAllowInputTimbangan:', error);
    return 0;
  }
};

/**
 * Check if user is allowed to input (generic / Bagian)
 * VBA equivalent: fnIsAllowInput from frm_Kal_Ser_Bagian.vba
 */
const isAllowInputBagian = async (userId) => {
  try {
    const query = `
      SELECT COUNT(*) as jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :userId
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    });
    return parseInt(result[0]?.jumRow || 0);
  } catch (error) {
    console.error('Error in isAllowInputBagian:', error);
    return 0;
  }
};

/**
 * Get Auto Sequence ID for Hasil Kalibrasi Bagian data
 * VBA equivalent: fnGetAuto_SuhuID from frm_Kal_Ser_Bagian.vba
 */
const getAutoHasilKalBagianID = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
      FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNumSuhu || 1;
  } catch (error) {
    console.error('Error in getAutoHasilKalBagianID:', error);
    return 1;
  }
};

/**
 * Check if Tgl Kalibrasi has been input (Bagian)
 * VBA equivalent: fnIsInputTglKalibrasi from frm_Kal_Ser_Bagian.vba
 */
const isInputTglKalibrasiBAGIAN = async (qaId, idNoSertifikat) => {
  try {
    const query = `
      SELECT Tgl_kalibrasi
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_id = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const tglKalibrasi = result[0]?.Tgl_kalibrasi;
    return tglKalibrasi !== null && tglKalibrasi !== undefined && tglKalibrasi !== '';
  } catch (error) {
    console.error('Error in isInputTglKalibrasiBAGIAN:', error);
    return false;
  }
};

/**
 * Get auto number for new Penghapusan header
 * VBA equivalent: fnGetNo_Penghapusan → dbo.fnGetKal_No_hapus(gstrDepartment)
 */
const getNoHapus = async (bagian) => {
  try {
    const query = `SELECT dbo.fnGetKal_No_hapus(:bagian) AS autoNum`;
    const result = await sequelizeMSQL.query(query, {
      replacements: { bagian },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.autoNum || '';
  } catch (error) {
    console.error('Error in getNoHapus:', error);
    return '';
  }
};

/**
 * Get next seq_ID for a Penghapusan Detail item
 * VBA equivalent: dbo.fnGet_SeqID_No_hapus(no_penghapusan)
 */
const getSeqIDNoHapus = async (no_penghapusan) => {
  try {
    const query = `SELECT dbo.fnGet_SeqID_No_hapus(:no_penghapusan) AS no_SeqID`;
    const result = await sequelizeMSQL.query(query, {
      replacements: { no_penghapusan },
      type: Sequelize.QueryTypes.SELECT,
    });
    return result[0]?.no_SeqID || '';
  } catch (error) {
    console.error('Error in getSeqIDNoHapus:', error);
    return '';
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
  getAutoKelembabanID,
  getAutoPreAdjID,
  getAutoPusatPanID,
  getAutoDayaUlangID,
  getAutoMassaStandardID,
  isInputTglKalibrasiTimbangan,
  isAllowInputTimbangan,
  isAllowInputBagian,
  getAutoHasilKalBagianID,
  isInputTglKalibrasiBAGIAN,
  getNoHapus,
  getSeqIDNoHapus,
};
