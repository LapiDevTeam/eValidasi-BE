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
      replacements: { strEmpID: strEmpID },
      type: QueryTypes.SELECT
    });

    if (results1.length > 0) {
      strTempWH = results1[0].emp_deptid;
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
      replacements: { strEmpID: strEmpID },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return results[0].Emp_Name;
    } else {
      return "";
    }
  } catch (error) {
    console.error('Error getting employee name:', error);
    return "";
  }
}

async function isApproverStatus(vDocumentNo, vDocumentDeptID, vDocumentApplicationCode, vUserName) {
  try {
    let strStatusTableName = "";
    let strPrimaryKeyName = "";
    let intLastApproverNo = 0;
    let str_flagApprMgrBagian = "0";
    let str_currStatusDoc = "0";
    let str_userLevel = "0";

    // Query to get status table and primary key
    let query = `
      SELECT Ass_StatusTable, Ass_PrimaryKey
      FROM m_Approver_Assistant
      WHERE Ass_ApplicationCode = :vDocumentApplicationCode
    `;

    let results = await sequelizeMSQL.query(query, {
      replacements: { vDocumentApplicationCode: vDocumentApplicationCode },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      strStatusTableName = results[0].Ass_StatusTable;
      strPrimaryKeyName = results[0].Ass_PrimaryKey;

      // Query to get the last approver number and current status
      query = `
        SELECT TOP 1 *
        FROM ${strStatusTableName}
        WHERE ${strPrimaryKeyName} = :vDocumentNo
        ORDER BY Approver_No DESC
      `;

      results = await sequelizeMSQL.query(query, {
        replacements: { vDocumentNo: vDocumentNo },
        type: QueryTypes.SELECT
      });

      if (results.length > 0) {
        intLastApproverNo = results[0].Approver_No;
        str_currStatusDoc = results[0].Approver_No;
      }

      // Query to get the approver manager department and user level
      query = `
        SELECT TOP 1 *, CASE WHEN ISNULL(appr_mgrbagian, 0) = 1 THEN '1' ELSE '0' END AS Appr_MgrDept
        FROM m_Approver_Lines
        WHERE appr_ApplicationCode = :vDocumentApplicationCode
          AND appr_deptID = :vDocumentDeptID
          AND appr_id = :vUserName
          AND isActive = 1
        ORDER BY appr_No
      `;

      results = await sequelizeMSQL.query(query, {
        replacements: {
          vDocumentApplicationCode: vDocumentApplicationCode,
          vDocumentDeptID: vDocumentDeptID,
          vUserName: vUserName
        },
        type: QueryTypes.SELECT
      });

      if (results.length > 0) {
        str_flagApprMgrBagian = results[0].Appr_MgrDept;
        str_userLevel = results[0].Appr_No;
      }
    }

    return {
      flagApprMgrBagian: str_flagApprMgrBagian,
      currStatusDoc: str_currStatusDoc,
      UserLevel: str_userLevel
    };
  } catch (error) {
    console.error('Error checking approver status:', error);
    return {
      flagApprMgrBagian: "0",
      currStatusDoc: "0",
      UserLevel: "0"
    };
  }
}

async function fnGetNewNoDoc() {
  try {
    const strBBBK = "RD";
    const currentMonth = moment().format('MM');
    const currentYear = moment().format('YYYY');

    const query = `
      SELECT RIGHT('0000' + CAST((CAST(ISNULL(MAX(LEFT(No_Doc, 5)), 0) AS INTEGER) + 1) AS VARCHAR), 5) AS Num
      FROM t_koreksi_RD
      WHERE No_Doc LIKE '%/${currentMonth}/${currentYear}/${strBBBK}/KS'
    `;

    const results = await sequelizeMSQL.query(query, {
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      const strAuto = `${results[0].Num}/${currentMonth}/${currentYear}/${strBBBK}/KS`;
      return strAuto;
    } else {
      return "";
    }
  } catch (error) {
    console.error('Error getting new No Doc:', error);
    return "";
  }
}

async function fnGetSeqID(noDoc) {
  try {
    const query = `
      SELECT ISNULL(MAX(SeqID), 0) + 1 AS SeqID
      FROM t_koreksi_RD
      WHERE No_Doc = :noDoc
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return results[0].SeqID;
    } else {
      return 1;
    }
  } catch (error) {
    console.error('Error getting Seq ID:', error);
    return 1;
  }
}

async function fnCekRowCount(noDoc) {
  try {
    const query = `
      SELECT COUNT(*) AS jum
      FROM T_Koreksi_RD
      WHERE No_Doc = :noDoc
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return results[0].jum < 9;
    } else {
      return true;
    }
  } catch (error) {
    console.error('Error checking row count:', error);
    return false;
  }
}

module.exports = {
  fnGetStatusNo,
  fnCekJobLevel,
  fnGetUserApprNo,
  Get_DeptID,
  Get_EmployeeName,
  isApproverStatus,
  fnGetNewNoDoc,
  fnGetSeqID,
  fnCekRowCount,
};