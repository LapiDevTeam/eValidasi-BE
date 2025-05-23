const { Sequelize } = require("sequelize");
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
const mssqlSequeliez = new Sequelize(
  configMssql.database,
  configMssql.user,
  configMssql.password,
  {
    host: configMssql.server,
    dialect: "mssql",
 dialectOptions: {
      options: {
        encrypt: false, // ⬅ nonaktifkan TLS/SSL
        trustServerCertificate: true,
      },
    },
    logging: false, // set true untuk melihat SQL log
  }
);
const BASE_URL = process.env.BE_URL;

module.exports = { configMssql, BASE_URL, mssqlSequeliez };
