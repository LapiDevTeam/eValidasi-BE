const sql = require("mssql");
const { configMssql } = require("../config/configMssql.js");

const fetchApproverInisial = async (data) => {
  try {
    console.log(data, "<<< DAT");
    const pool = await sql.connect(configMssql);
    let objInisial = {
      inisial_user_id: "",
      inisial_delegated_to: "",
    };
    if (data.user_id === data.delegated_to) {
      const request = pool.request();
      const result = await request.query(`
          SELECT dbo.fnGetInisialKaryawan('${data.user_id}')
          `);
      resultString = result.recordset[0][""];
      return result.recordset[0][""];
    } else {
      for (const key in data) {
        if (Object.hasOwnProperty.call(data, key)) {
          const element = data[key];

          const request = pool.request();
          const result = await request.query(`
            SELECT dbo.fnGetInisialKaryawan('${element}')
            `);
          if (key === "user_id")
            objInisial.inisial_user_id = result.recordset[0][""];
          if (key === "delegated_to")
            objInisial.inisial_delegated_to = result.recordset[0][""];
        }
      }
      return `${objInisial.inisial_delegated_to} An. ${objInisial.inisial_user_id} `;
    }
  } catch (error) {
    console.log(error);
    return { message: "Gagal pada server mssql" };
  }
};

const fetchPekerjaAutoGenerateApproverSameDept = async ({
  Appr_ApplicationCode,
  bagian,
  joblevel_name,
  Appr_No,
  Appr_DefinitionID,
}) => {
  try {
    let payload = {
      spvmanager: `'6','5','4','3'`,
      pelaksana: `'7','8'`,
      spv: `'6','5'`,
      manager: `'3'`,
      astdanmanager: `'3','4'`,
      head: `'2'`,
      PL: `'1'`,
      DS: `'1'`,
    };
    let joblevel_id = payload[joblevel_name];
    const pool = await sql.connect(configMssql);
    const request = pool.request();
    const result = await request.query(`
      select a.Nama, a.Bagian, a.Jabatan, a.Job_LevelID , a.inisialname, d.emp_NIK AS "pekerja_NIK"
                From m_karyawan a
                LEFT JOIN m_employee d ON a.Pk_ID = d.emp_mskryID AND a.isActive = d.isActive
                where a.isActive = 1 AND a.Bagian = '${bagian}' AND  a.Job_LevelID IN (${joblevel_id})
                and a.site_id = 4  
      `);
    const payloadInsertApproverLine = result.recordset.map((el) => {
      return `('${Appr_ApplicationCode}','${bagian}','${Appr_No}' , '${el.pekerja_NIK}' , '${el.Jabatan}', '${Appr_DefinitionID}' , GETDATE() , 'MAA' , 'MAA' , 1 )`;
    });
    const request1 = pool.request();
    await request1.query(`
      DELETE FROM m_Approver_lines
        where Appr_ApplicationCode = '${Appr_ApplicationCode}' AND Appr_DeptID = '${bagian}' AND Appr_No = '${Appr_No}'
      `);

    const request2 = pool.request();
    await request2.query(`
      INSERT INTO m_Approver_lines (Appr_ApplicationCode, Appr_DeptID, Appr_No, Appr_ID , Appr_CC , Appr_DefinitionID , Process_Date , User_ID , Delegated_To , isActive)
      VALUES ${payloadInsertApproverLine.join(",")}
      `);

    return { message: "Succed Approved" };
  } catch (error) {
    console.log(error);
    return { message: "Error on mssql database" };
  }
};

module.exports = {
  fetchApproverInisial,
  fetchPekerjaAutoGenerateApproverSameDept,
};
