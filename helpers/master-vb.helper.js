const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { QueryTypes } = require('sequelize');


async function userAccess(menu, gstrUserName) {
  const query = `
    SELECT a.Prog_ID, b.IsReadOnly, d.Emp_DeptID
    FROM m_Programs a
    INNER JOIN m_Access_Right b ON a.Prog_ID = b.Prog_ID
    INNER JOIN m_Group_User c ON b.Group_ID = c.Group_ID
    INNER JOIN m_Employee d ON c.Group_NIK = d.Emp_NIK
    WHERE c.Group_NIK = :gstrUserName
    AND a.Prog_Name = :menu
    AND a.Prog_ID LIKE '__%-_1%'
    AND d.isActive = 1
    AND a.isactive = 1
    AND c.isActive = 1
  `;

  try {
    const results = await sequelizeMSQL.query(query, {
      replacements: { gstrUserName: gstrUserName, menu },
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      const { IsReadOnly } = results[0];
      global.gblnReadOnly = IsReadOnly;
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

async function retmid() {
  const asdb = await userAccess('Penerimaan Pengeluaran Sample RD', 'ARI');
  console.log({asdb});
  return asdb;
}

// retmid();

module.exports = userAccess;