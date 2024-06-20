const { t_productBrief, t_productBrief_status } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");
const { checkStatusProductBrief } = require("../helpers/checkStatus");
const { getStatus } = require("../helpers/statusProductBrief");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");

class ControllerProductBrief {
  static async createProductBrief(req, res, next) {
    const { user_id, delegated_to, nama_user, joblevel_id_user, inisial_user } =
      req.user;
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
        upload,
        revisi,
      } = req.body;

      const existingProtokol = await t_productBrief.findOne({
        where: {
          productBrief: productBrief,
        },
        order: [["createdAt", "DESC"]],
      });

      let newRevisi;

      if (
        existingProtokol &&
        existingProtokol.dataValues.status === "Approved"
      ) {
        newRevisi = existingProtokol.revisi + 1;
      } else if (
        existingProtokol &&
        existingProtokol.dataValues.status !== "Approved"
      ) {
        throw new MyError(
          404,
          "Product Brief masih Draft, menunggu status menjadi approved"
        );
      } else {
        newRevisi = 0;
      }

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

      const createProductBrief = await t_productBrief.create({
        productBrief: productBrief,
        kode: kode,
        nama: nama,
        kemasan: kemasan,
        bentukSediaan: bentukSediaan,
        ruangLingkup: ruangLingkup,
        bahanAktifDanDosis: bahanAktifDanDosis,
        rdSelection: rdSelection,
        status: status,
        upload: upload,
        revisi: newRevisi,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Data has been saved !",
        // data: createProductBrief,
      });
    } catch (err) {
      console.log(err);
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
        status = "Draft",
        upload,
      } = req.body;

      const [updatedRowsCount] = await t_productBrief.update(
        {
          productBrief: productBrief,
          kode: kode,
          nama: nama,
          kemasan: kemasan,
          bentukSediaan: bentukSediaan,
          ruangLingkup: ruangLingkup,
          bahanAktifDanDosis: bahanAktifDanDosis,
          rdSelection: rdSelection,
          status: "Draft",
          upload: upload,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Data has been saved !",
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
      const { page } = req.query;
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
      const size = page ? 7 : "";

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

      const brief = await t_productBrief.findAndCountAll({
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
  static async getProductBriefDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;

      const { id } = req.params;

      let productBriefDetail;
      if (
        +joblevel_id_user === 1 ||
        bagian_user === "HD" ||
        bagian_user === "RD"
      ) {
        productBriefDetail = await t_productBrief?.findOne({
          where: {
            id,
          },
          include: { model: t_productBrief_status, as: "approver_data" },
          order: [
            [
              { model: t_productBrief_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      } else {
        productBriefDetail = await t_productBrief.findOne({
          where: {
            id,
            rdSelection: bagian_user,
          },
          include: {
            model: t_productBrief_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_productBrief_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      const apprApplicationCode = productBriefDetail.apprAplicationCode;
      const apprDeptId = productBriefDetail.rdSelection;
      const apprNo = await checkStatusProductBrief(id);

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "productBrief",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );

      if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({ productBriefDetail, isApprove });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async getHistoryProductBrief(req, res, next) {
    try {
      const { id } = req.params;
      console.log(id);
      // find prosedur pengolahan table
      const productBrief = await t_productBrief.findByPk(+id);

      if (!productBrief) {
        console.log("NotFound");
        res.status(404).json({ error: "Not Found" });
      } else {
        // find approval history table
        const approvalHistory = await t_productBrief_status.findAll({
          where: {
            ProductBriefId: +id,
          },
          order: [["createdAt", "DESC"]],
        });

        console.log(approvalHistory, "12213213213");
        res.status(200).json({ approvals: approvalHistory });
      }
    } catch (error) {
      next(error);
      console.log(error);
    }
  }

  static async getNoProductBrief(req, res) {
    try {
      const noProductBrief = await t_productBrief.findAll({
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

      await t_productBrief.destroy({
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

      res.status(200).json({
        message: "Success Mail",
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async updateStatus(req, res) {
    try {
      const { ProductBriefID } = req.params;

      const { status } = req.body;
      const findProductBriefID = await t_productBrief.findByPk(+ProductBriefID);

      if (!findProductBriefID) throw { name: "NotFound" };
      const updateStatus = await t_productBrief.update(
        { status: status },
        {
          where: {
            id: findProductBriefID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateStatus);
    } catch (err) {
      console.log(err);
    }
  }
  static async approveProductBrief(req, res, next) {
    try {
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
      } = req.user;

      const { is_approve, keterangan_reject = null } = req.body;
      const { id } = req.params;
      const findProductBrief = await t_productBrief?.findByPk(+id);

      if (!findProductBrief)
        throw new MyError(404, "Form ProductBrief tidak ditemukan");
      const apprNo = await checkStatusProductBrief(id);

      const dataApprove = await approverRecordset(
        // findProductBrief.nama_pegawai,
        "productBrief",
        findProductBrief.rdSelection,
        apprNo,
        user_id,
        nama_user
      );

      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let status;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        status = getStatus(dataApprove.recordset[0]?.Appr_DefinitionID);

      if (dataApprove.recordset1.length === 0) status = "Approved";
      if (is_approve === false) status = "Reject";

      await t_productBrief_status.create({
        ProductBriefId: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_productBrief.update(
        {
          status: status,
          alasan_reject: keterangan_reject,
          // user_id,
          // delegated_to,
        },
        {
          where: {
            id,
          },
        }
      );
      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProductBrief;
