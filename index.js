require("dotenv").config();
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");

const cron = require("node-cron");
// const handleError = require("./middlewares/error");
const routers = require("./routers");
const app = express();
const multer = require("multer");
const path = require("path");
const { Kemasan } = require("./models");
const errorHandler = require("./middlewares/errorHandler");
const error = require("./middlewares/error");
const { BASE_URL } = require("./config/configMssql");
const port = process.env.PORT || 3001;

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
app.use(routers);
app.use(error);

app.listen(port, () => {
  console.log(`LAPI eFormulation Record app listening on port ${port}`);
});
