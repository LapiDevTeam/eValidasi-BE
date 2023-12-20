const { ProductBrief } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");

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
        rdSelection,
        status,
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
        rdSelection: rdSelection,
        status: status,
      });

      res.status(201).json({
        message: "Success Create CUY",
      });
    } catch (err) {
      next(err);
    }
  }
  static async editProductBrief(req, res, next) {
    const { id } = req.params;
    try {
      const {
        productBrief,
        kode,
        nama,
        kemasan,
        bentukSediaan,
        ruangLingkup,
        bahanAktifDanDosis,
        rdSelection,
        status,
      } = req.body;

      const [updatedRowsCount] = await ProductBrief.update(
        {
          productBrief: productBrief,
          kode: kode,
          nama: nama,
          kemasan: kemasan,
          bentukSediaan: bentukSediaan,
          ruangLingkup: ruangLingkup,
          bahanAktifDanDosis: bahanAktifDanDosis,
          rdSelection: rdSelection,
          status: status,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Product brief updated successfully",
        });
      } else {
        res.status(404).json({
          message: "Product brief not found",
        });
      }
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
  static async findAllProductBrief(req, res) {
    try {
      const {
        page,
        productBrief,
        kode,
        nama,
        kemasan,
        bentukSediaan,
        ruangLingkup,
        bahanAktifDanDosis,
        rdSelection,
        status,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (productBrief)
        searchParams.productBrief = { [Op.iLike]: `%${productBrief}%` };
      if (kode) searchParams.kode = { [Op.iLike]: `%${kode}%` };
      if (nama) searchParams.nama = { [Op.iLike]: `%${nama}%` };
      if (kemasan) searchParams.kemasan = { [Op.iLike]: `%${kemasan}%` };
      if (bentukSediaan) searchParams.bentukSediaan = +bentukSediaan;
      if (ruangLingkup)
        searchParams.ruangLingkup = { [Op.iLike]: `%${ruangLingkup}%` };
      if (bahanAktifDanDosis)
        searchParams.bahanAktifDanDosis = {
          [Op.iLike]: `%${bahanAktifDanDosis}%`,
        };
      if (rdSelection)
        searchParams.rdSelection = {
          [Op.iLike]: `%${rdSelection}%`,
        };
      if (status)
        searchParams.status = {
          [Op.iLike]: `%${status}%`,
        };

      const brief = await ProductBrief.findAndCountAll({
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
  static async getProductBriefDetails(req, res) {
    const { id } = req.params;
    try {
      const briefDetail = await ProductBrief.findByPk(id);
      if (!briefDetail) throw new MyError(400, "notFound!");

      res.status(200).json(briefDetail);
    } catch (err) {
      console.log(err);
    }
  }
  static async getNoProductBrief(req, res) {
    try {
      const noProductBrief = await ProductBrief.findAll({
        attributes: ["productBrief"], // Replace 'columnName' with the actual name of the column you want
      });
      if (!noProductBrief) throw new MyError(400, "notFound!");

      res.status(200).json(noProductBrief);
    } catch (err) {
      console.log(err);
    }
  }
  static async deleteProductBrief(req, res) {
    try {
      const { id } = req.params;

      await ProductBrief.destroy({
        where: { id: id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
  static async nodeMailer(req, res, next) {
    try {
      const info = await transporter.sendMail({
        from: '"no_reply_it " <no_reply_it@lapilabs.co.id>', // sender address
        to: ["gunardi.cahyadi@lapilabs.co.id", "cahyadigunardi@gmail.com"], // list of receivers
        subject: "Hello  test✔", // Subject line
        text: "Hellow world?", // plain text body
        html: "<b>Hellowwww world? Hai hai</b>", // html body
      });

      console.log("Message sent: %s", info.messageId);

      res.status(200).json({
        message: "Success Mail",
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}

module.exports = ControllerProductBrief;
