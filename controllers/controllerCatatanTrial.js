const { CatatanTrial, KomposisiCatatanTrial } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");

class ControllerCatatanTrial {
  static async findAllNamaProduct(req, res) {
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
          `SELECT Product_ID, Product_Name, Product_Category FROM m_product WHERE Product_Category = '01' AND isActive = '1';
          `,
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
  static async createCatatanTrial(req, res, next) {
    try {
      const {
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
      } = req.body;

      if (!tanggalTrial) {
        throw new MyError(400, "tanggalTrial is required !");
      } else if (!kodeTrial) {
        throw new MyError(400, "kodeTrial is require !");
      } else if (!trialKe) {
        throw new MyError(400, " is required !");
      } else if (!bentukSediaan) {
        throw new MyError(400, "Bentuk Sediaan is required !");
      } else if (!productKompetitor) {
        throw new MyError(400, "productKompetitor is required !");
      }

      const createCatatanTrial = await CatatanTrial.create({
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
      });

      res.status(201).json({
        message: "Success Create CatatanTrial",
        data: createCatatanTrial,
      });
    } catch (err) {
      next(err);
    }
  }
  static async findNamaBahanBaku(req, res) {
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
          `
          SELECT ItemID,ItemName,Analisa,batchno,principle FROM t_NP_Sample_Stock WHERE ItemID != '' AND ItemID != '-'
          ;
          `,
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
  static async createKomposisiCatatanTrial(req, res, next) {
    try {
      const {
        kode,
        namaBahanBaku,
        principle,
        jumlahTiapSediaan,
        CatatanTrialID,
      } = req.body;

      const createKomposisi = await KomposisiCatatanTrial.create({
        kode,
        namaBahanBaku,
        principle,
        jumlahTiapSediaan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create komposisiCatatanTrial",
        data: createKomposisi,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getKomposisiNamaBahan(req, res) {
    const { id } = req.params;
    try {
      const komposisi = await KomposisiCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(komposisi);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = ControllerCatatanTrial;
