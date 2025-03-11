const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { QueryTypes } = require('sequelize');

async function fnGetStatusNo(noDoc) {
  try {
    const query = `
      SELECT TOP 1 Approver_No
      FROM t_koreksi_RD_Status
      WHERE No_Doc = :noDoc
      ORDER BY Approver_No DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (results.length === 0) {
      return 0;
    } else {
      return parseInt(results[0].Approver_No, 10);
    }
  } catch (error) {
    console.error('Error getting status number:', error);
    return 0;
  }
}

async function fnCekJobLevel(userId) {
  try {
    const query = `
      SELECT emp_JobLevelID
      FROM vUserLogin
      WHERE log_NIK LIKE :userId
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { userId },
      type: QueryTypes.SELECT
    });

    if (results.length === 0) {
      return "";
    } else {
      return results[0].emp_JobLevelID || "";
    }
  } catch (error) {
    console.error('Error checking job level:', error);
    return "";
  }
}

async function fnGetUserApprNo(deptID, uID) {
  try {
    const query = `
      SELECT TOP 1 Appr_No
      FROM m_Approver_Lines
      WHERE appr_ApplicationCode = 'KoreksiRD'
        AND appr_deptID = :deptID
        AND appr_id = :uID
      ORDER BY Appr_No DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { deptID, uID },
      type: QueryTypes.SELECT
    });

    if (results.length === 0) {
      return 0;
    } else {
      return parseInt(results[0].Appr_No, 10);
    }
  } catch (error) {
    console.error('Error getting user approval number:', error);
    return 0;
  }
}

async function Get_DeptID(strEmpID) {
  try {
    let strTempWH = "";

    const query1 = `
      SELECT emp_deptid
      FROM m_Employee
      WHERE emp_nik = :strEmpID
    `;

    const results1 = await sequelizeMSQL.query(query1, {
      replacements: { strEmpID: strEmpID.trim() },
      type: QueryTypes.SELECT
    });

    if (results1.length > 0) {
      strTempWH = results1[0].emp_deptid.trim();
    }

    const query2 = `
      SELECT *
      FROM m_pc_jadi_wh
    `;

    const results2 = await sequelizeMSQL.query(query2, {
      type: QueryTypes.SELECT
    });

    if (results2.length > 0 && results2[0].IsActive) {
      strTempWH = strTempWH.replace("WH", "PC");
    }

    return strTempWH;
  } catch (error) {
    console.error('Error getting department ID:', error);
    return "";
  }
}

async function Get_EmployeeName(strEmpID) {
  try {
    const query = `
      SELECT Emp_Name
      FROM m_Employee
      WHERE Emp_NIK = :strEmpID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { strEmpID: strEmpID.trim() },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return results[0].Emp_Name.trim();
    } else {
      return "";
    }
  } catch (error) {
    console.error('Error getting employee name:', error);
    return "";
  }
}

module.exports = {
  fnGetStatusNo,
  fnCekJobLevel,
  fnGetUserApprNo,
  Get_DeptID,
  Get_EmployeeName
};