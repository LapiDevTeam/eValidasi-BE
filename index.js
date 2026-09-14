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
// Mengembalikan jatah cetak yang ditahan job menggantung (tab ditutup di tengah
// preview, printForm mati sebelum melapor). Tanpa penyapu ini, satu tab yang
// ditutup diam-diam menahan jatah selamanya dan user tidak akan pernah bisa
// mencetak lagi tanpa campur tangan DBA.
const printJobService = require("./services/printJob.service");
cron.schedule("*/5 * * * *", async () => {
  try {
    const expired = await printJobService.sweepExpiredJobs();
    if (expired > 0) console.log(`[printForm] ${expired} job kedaluwarsa dibereskan`);
  } catch (error) {
    console.error("[printForm] Gagal menyapu job kedaluwarsa:", error.message);
  }
});

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

  // Diperiksa setelah server mendengarkan, karena pemeriksaannya memanggil
  // alamat publik backend ini sendiri. Salah alamat di sini membuat job tetap
  // terbuat dan kuota tetap dipesan, lalu gagal jauh di hilir dengan 404 yang
  // tidak menunjuk sebabnya — lebih baik diteriakkan sekarang.
  printJobService
    .checkPublicBaseUrl()
    .then((result) => {
      if (result.ok) {
        console.log('[printForm] Alamat publik OK');
      } else {
        console.warn(`[printForm] PERINGATAN: ${result.message}`);
      }
    })
    .catch((err) => console.warn('[printForm] Gagal memeriksa alamat publik:', err.message));
});
