const { ProductBrief } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");

class ControllerProductBrief {
  static async createProductBrief(req, res, next) {
    try {
      const {
        productBrief,
        kode,
        nama,
        kemasan,
        bentukSediaan,
        ruangLingkup,
        bahanAktifDanDosis,
      } = req.body;

      if (!productBrief) {
        throw new MyError(400, "Product Brief is required !");
      } else if (!kode) {
        throw new MyError(400, "Kode is required !");
      } else if (!nama) {
        throw new MyError(400, "Nama is require !");
      } else if (!kemasan) {
        throw new MyError(400, "Kemasan is required !");
      } else if (!bentukSediaan) {
        throw new MyError(400, "Bentuk Sediaan is required !");
      } else if (!ruangLingkup) {
        throw new MyError(400, "Ruang Lingkup is required !");
      } else if (!bahanAktifDanDosis || bahanAktifDanDosis.length === 0) {
        throw new MyError(
          400,
          "At least one bahanAktifDanDosis is be provided"
        );
      }

      const createProductBrief = await ProductBrief.create({
        productBrief: productBrief,
        kode: kode,
        nama: nama,
        kemasan: kemasan,
        bentukSediaan: bentukSediaan,
        ruangLingkup: ruangLingkup,
        bahanAktifDanDosis: bahanAktifDanDosis,
      });

      res.status(201).json({
        message: "Success Create CUY",
      });
    } catch (err) {
      next(err);
    }
  }

  static async findAllSediaan(req, res) {
    const { sites } = req.query;

    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `SELECT DISTINCT mps.Sediaan_Kode, mps.Sediaan_Nama
          FROM m_Product mp
          JOIN vwProductPPI vw ON vw.PPI_ProductID = mp.Product_ID
          JOIN m_Product_Sediaan mps ON mp.Product_BentukSediaan = mps.Sediaan_Kode;`,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async findAllRuangLingkup(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `SELECT DISTINCT id as RuangLingkup_id,name as RuangLingkup_Name
          From m_Product_RuangLingkup mprl ;`,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProductBrief;
