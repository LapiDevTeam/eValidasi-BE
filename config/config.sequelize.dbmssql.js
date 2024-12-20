const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../ssl/.env') })
const { Sequelize } = require('../models');


const dbmsConfig = {
  HOST: process.env.MS_SQL_DB_SERVER,
  USER: process.env.MS_SQL_DB_USER,
  PASSWORD: process.env.MS_SQL_DB_PWD,
  DB: process.env.MS_SQL_DB_NAME,
  dialect: "mssql",
  pool: {
    max: 1000,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

const sequelizeMSQL = new Sequelize(dbmsConfig.DB, dbmsConfig.USER, dbmsConfig.PASSWORD, {
  host: dbmsConfig.HOST,
  dialect: 'mssql',
  pool: {
    max: dbmsConfig.pool.max,
    min: dbmsConfig.pool.min,
    acquire: dbmsConfig.pool.acquire,
    idle: dbmsConfig.pool.idle,
  },
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
  // logging: console.log,
});


module.exports = {
  sequelizeMSQL
}