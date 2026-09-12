require("dotenv").config();
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const timeout = require('connect-timeout');

const cron = require("node-cron");
// const handleError = require("./middlewares/error");
const routers = require("./routers");
const app = express();
const multer = require("multer");
const path = require("path");
const { Kemasan } = require("./models");
const errorHandler = require("./middlewares/errorHandler");
const error = require("./middlewares/error");
const errorLogger = require("./middlewares/errorLogger");
const { BASE_URL } = require("./config/configMssql");
const port = process.env.PORT || 3001;
const sqllapi = process.env.MS_SQL_DB_SERVER;
cron.schedule("30 7 * * *", async () => {
  try {
    const response = await fetch(`${BASE_URL}/studi-praformulasi-pending`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    console.log("API request was successful");
  } catch (error) {
    console.error("Error making API request:", error);
  }
});

app.use(express.static("public"));
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(timeout('6000s')); // Set timeout to 100 minutes (6000 seconds)

// Simple request logger for development debugging.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} | user: ${req.user?.user_id || '-'}`);
  next();
});

app.use(routers);
app.use(errorLogger);
app.use(error);

app.listen(port, () => {
  console.log(`E-Validation app listening on port ${port} ${sqllapi}`);
});
