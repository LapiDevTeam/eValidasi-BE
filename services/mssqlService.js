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

module.exports = {
  fetchApproverInisial,
};
