const { t_productBrief_status } = require("../models/index");
const sql = require("mssql");
const configMssql = {
  user: process.env.MS_SQL_DB_USER,
  password: process.env.MS_SQL_DB_PWD,
  server: process.env.MS_SQL_DB_SERVER,
  database: process.env.MS_SQL_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
const isApproveValidation = async (
  //   nama_pekerja,
  apprApplicationCode,
  apprDeptId,
  apprNo,
  user_id,
  nama_user
) => {
  try {
    console.log(apprApplicationCode, apprDeptId, apprNo, user_id, "< AAAA");
    let isApprove = false;

    const pool = await sql.connect(configMssql);

    const request = pool.request();
    const result1 = await request
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprApplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), apprDeptId)
      .input("Appr_No", sql.Int, apprNo)
      .input("Appr_ID", sql.NVarChar(50), user_id)
      .query(
        `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No AND mal.Appr_ID = @Appr_ID`
      );

    if (result1.recordset.length > 0) isApprove = true;
    return isApprove;
  } catch (error) {
    return { message: "Gagal memuat" };
  }
};
const approverRecordset = async (
  //   nama_pekerja,
  apprAplicationCode,
  bagian,
  apprNo,
  user_id,
  nama_user
) => {
  try {
    let queryApprover = `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No AND mal.Appr_ID = @Appr_ID `;
    // if (apprNo === 1) {
    //   if (nama_pekerja !== nama_user)
    //     throw new MyError(402, "Not Authentication");
    //   queryApprover = `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No`;
    // }

    const pool = await sql.connect(configMssql);
    const request = pool.request();

    console.log(apprAplicationCode, bagian, apprNo, user_id, "< AAAA");

    const result = await request
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprAplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), bagian)
      .input("Appr_ID", sql.NVarChar(50), user_id)
      .input("Appr_No", sql.Int, apprNo)
      .query(queryApprover);
    console.log(result, "< res");

    const request1 = pool.request();
    const result1 = await request1
      .input("Appr_ApplicationCode", sql.NVarChar(50), apprAplicationCode)
      .input("Appr_DeptID", sql.NVarChar(50), bagian)
      .input("Appr_No", sql.Int, apprNo + 1)
      .query(
        `SELECT  * FROM  m_Approver_Lines mal WHERE  mal.Appr_ApplicationCode = @Appr_ApplicationCode AND mal.Appr_DeptID = @Appr_DeptID AND mal.Appr_No = @Appr_No `
      );
    const recordset = result.recordset;
    const recordset1 = result1.recordset;
    return { recordset, recordset1 };
  } catch (error) {
    return { message: "gagal approved" };
  }
};

module.exports = {
  isApproveValidation,
  approverRecordset,
  //   approverCuti,
  //   approverHrCuti,
};
