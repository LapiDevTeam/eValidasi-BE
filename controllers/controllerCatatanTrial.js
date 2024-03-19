const {
  CatatanTrial,
  KomposisiCatatanTrial,
  PerhitunganZatAktif,
  MetodePembuatan,
  ProsesCatatanTrialPadat,
  Pembahasan,
  Kesimpulan,
  TindakLanjut,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");

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
  static async createPerhitunganZatAktif(req, res, next) {
    try {
      const {
        padaEtiket,
        bahanBakuYangDigunakan,
        perhitunganBahanBaku,
        CatatanTrialID,
      } = req.body;

      const createPerhitunganZatAktif = await PerhitunganZatAktif.create({
        padaEtiket,
        bahanBakuYangDigunakan,
        perhitunganBahanBaku,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create perhitungan zat aktif",
        data: createPerhitunganZatAktif,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createMetodePembuatan(req, res, next) {
    try {
      const { aktivitas, pengamatan, CatatanTrialID } = req.body;

      const createMetodePembuatan = await MetodePembuatan.create({
        aktivitas,
        pengamatan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create metode pembuatan",
        data: createMetodePembuatan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createProsesCatatanTrialPadat(req, res, next) {
    try {
      const {
        speed,
        mainPressure,
        prePressure,
        settingBobot,
        kekerasan,
        tebal,
        abrasi,
        wh,
        keterangan,
        CatatanTrialID,
      } = req.body;

      const createProsesCatatanTrialPadat =
        await ProsesCatatanTrialPadat.create({
          speed,
          mainPressure,
          prePressure,
          settingBobot,
          kekerasan,
          tebal,
          abrasi,
          wh,
          keterangan,
          CatatanTrialID,
        });

      res.status(201).json({
        message: "Success Create proses Catatna trial padat",
        data: createProsesCatatanTrialPadat,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createPembahasan(req, res, next) {
    try {
      const { pembahasan, CatatanTrialID } = req.body;

      const createPembahasan = await Pembahasan.create({
        pembahasan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create pembahasan",
        data: createPembahasan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKesimpulan(req, res, next) {
    try {
      const { kesimpulan, CatatanTrialID } = req.body;

      const createKesimpulan = await Kesimpulan.create({
        kesimpulan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create kesimpulan",
        data: createKesimpulan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createTindakLanjut(req, res, next) {
    try {
      const { tindakLanjut, CatatanTrialID } = req.body;

      const createTindakLanjut = await TindakLanjut.create({
        tindakLanjut,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create tindakLanjut",
        data: createTindakLanjut,
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
  static async findAllCatatanTrial(req, res) {
    try {
      const {
        page,
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (tanggalTrial)
        searchParams.tanggalTrial = { [Op.iLike]: `%${tanggalTrial}%` };
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (kodeTrial) searchParams.kodeTrial = { [Op.iLike]: `%${kodeTrial}%` };
      if (trialKe) searchParams.trialKe = { [Op.iLike]: `%${trialKe}%` };
      if (bentukSediaan) searchParams.bentukSediaan = +bentukSediaan;
      if (productKompetitor)
        searchParams.productKompetitor = {
          [Op.iLike]: `%${productKompetitor}%`,
        };
      if (statusB)
        searchParams.statusB = {
          [Op.iLike]: `%${statusB}%`,
        };
      if (statusA)
        searchParams.statusA = {
          [Op.iLike]: `%${statusA}%`,
        };

      const brief = await CatatanTrial.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(brief.count / limit) : "",
        brief,
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async deleteCatatanTrial(req, res) {
    try {
      const { id } = req.params;

      await CatatanTrial.destroy({
        where: { id: +id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerCatatanTrial;
