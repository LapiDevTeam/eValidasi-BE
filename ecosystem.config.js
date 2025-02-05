require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "eFormulation-dev",
      script: "./index.js",
      env: {
        NODE_ENV: "development",
        PORT: process.env.PORT,
        MS_SQL_DB_SERVER: process.env.MS_SQL_DB_SERVER,
        MS_SQL_DB_NAME: process.env.MS_SQL_DB_NAME,
        MS_SQL_DB_USER: process.env.MS_SQL_DB_USER,
        MS_SQL_DB_PWD: process.env.MS_SQL_DB_PWD,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        PG_SQL_DB_SERVER: process.env.PG_SQL_DB_SERVER,
        PG_SQL_DB_NAME: process.env.PG_SQL_DB_NAME,
        PG_SQL_DB_USER: process.env.PG_SQL_DB_USER,
        PG_SQL_DB_PWD: process.env.PG_SQL_DB_PWD,
        PG_SQL_DB_PORT: process.env.PG_SQL_DB_PORT,
        GLOBAL_API_URL: process.env.GLOBAL_API_URL,
        CRYPTO_KEY: process.env.CRYPTO_KEY,
      },
    },
  ],
};
