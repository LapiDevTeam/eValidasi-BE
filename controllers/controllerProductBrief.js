const {
  t_productBrief,
  t_productBrief_status,
  t_productBrief_hist,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");
const { checkStatusProductBrief } = require("../helpers/checkStatus");
const { getStatus } = require("../helpers/statusProductBrief");
const multer = require("multer");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");
const { log } = require("console");

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
        statusDokumen,
        upload,
        revisi,
      } = req.body;

      const existingProtokol = await t_productBrief.findOne({
        where: {
          productBrief: productBrief,
        },
        order: [["createdAt", "DESC"]],
      });
      console.log(revisi, "< revi");
      let newRevisi;
      let newUpload = upload.filter((item) => item.trim() !== "");

      if (revisi) {
        newRevisi = revisi;
      } else {
        if (
          existingProtokol &&
          existingProtokol.dataValues.statusDokumen === "Approved"
        ) {
          newRevisi = existingProtokol.revisi + 1;
        } else if (
          existingProtokol &&
          existingProtokol.dataValues.statusDokumen !== "Approved"
        ) {
          throw new MyError(
            404,
            "Product Brief masih Draft, menunggu status menjadi approved"
          );
        } else {
          newRevisi = 0;
        }
      }

      // Set revisi to "00" if not provided in the request body
      // const finalRevisi = revisi ? revisi : 0;

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
        statusDokumen: statusDokumen,
        upload: newUpload,
        revisi: newRevisi,
        user_id,
        delegated_to,
      });

      res
        .status(201)
        .json({ message: "Success Create", id: createProductBrief.id });
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
        statusDokumen = "Draft",
        upload,
        alasanDelete,
      } = req.body;

      let newUpload = upload?.filter((item) => item?.trim() !== "");

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
          statusDokumen: "Draft",
          upload: newUpload,
          alasanDelete: alasanDelete,
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
      console.log(err, "<<<< ERRROR");
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
        statusDokumen,
      } = req.query;

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
      if (statusDokumen)
        searchParams.statusDokumen = {
          [Op.iLike]: `%${statusDokumen}%`,
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

      let productBriefDetail = await t_productBrief.findOne({
        where: {
          id,
          // rdSelection: bagian_user,
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

      if (
        bagian_user === "HD" ||
        productBriefDetail?.rdSelection === bagian_user
      ) {
        const apprDeptId = productBriefDetail.rdSelection;
        const apprNo = await checkStatusProductBrief(id);

        const isApprove = await isApproveValidation(
          "productBrief",
          apprDeptId,
          apprNo,
          user_id
        );

        if (isApprove.message) throw new MyError(400, isApprove.message);
        res.status(200).json({ productBriefDetail, isApprove });
      } else {
        throw new MyError(403, "tidak sesuai dengan rdSelection");
      }
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getHistoryProductBrief(req, res, next) {
    try {
      const { id } = req.params;

      // find prosedur pengolahan table
      const productBrief = await t_productBrief.findByPk(+id);

      if (!productBrief) {
        res.status(404).json({ error: "Not Found" });
      } else {
        // find approval history table
        const approvalHistory = await t_productBrief_status.findAll({
          where: {
            ProductBriefId: +id,
          },
          order: [["createdAt", "DESC"]],
        });

        res.status(200).json({ approvals: approvalHistory });
      }
    } catch (error) {
      next(error);
      console.log(error);
    }
  }
  static async getDeletedProductBrief(req, res, next) {
    try {
      const {
        page,
        productBrief,
        kode,
        nama,
        revisi,
        alasanDelete,
        kemasan,
        bentukSediaan,
        ruangLingkup,
        bahanAktifDanDosis,
        rdSelection,
        statusDokumen,
      } = req.query;

      const size = page ? 7 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (productBrief)
        searchParams.productBrief = { [Op.iLike]: `%${productBrief}%` };
      if (kode) searchParams.kode = { [Op.iLike]: `%${kode}%` };
      if (revisi) searchParams.revisi = { [Op.iLike]: `%${revisi}%` };
      if (nama) searchParams.nama = { [Op.iLike]: `%${nama}%` };
      if (alasanDelete)
        searchParams.alasanDelete = { [Op.iLike]: `%${alasanDelete}%` };

      const deleteProductBriefs = await t_productBrief_hist.findAndCountAll({
        where: {
          status: "DELETED",
        },
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(deleteProductBriefs.count / limit) : "",
        deleteProductBriefs,
      });

      // Find all deleted product briefs
      // const deletedProductBriefs = await t_productBrief_hist.findAll({
      //   where: {
      //     status: "DELETED",
      //   },
      //   order: [["createdAt", "DESC"]],
      // });

      // res.status(200).json({ deletedProductBrief: deletedProductBriefs });
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
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
      } = req.user;

      const { id } = req.params;
      const flag_update = "UPDATE FOR DELETE";
      const findProductBrief = await t_productBrief.findByPk(+id);
      if (!findProductBrief)
        throw new MyError(404, "Form Product Brief tidak di temukan");

      await t_productBrief_status.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { ProductBriefId: +id },
        }
      );
      await t_productBrief_status.destroy({
        where: { ProductBriefId: +id },
      });

      await t_productBrief.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { id: +id },
        }
      );
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

      const { statusDokumen } = req.body;
      const findProductBriefID = await t_productBrief.findByPk(+ProductBriefID);

      if (!findProductBriefID) throw { name: "NotFound" };
      const updateStatus = await t_productBrief.update(
        { statusDokumen: statusDokumen },
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
        "productBrief",
        findProductBrief.rdSelection,
        apprNo,
        user_id,
        nama_user
      );

      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let statusDokumen;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        statusDokumen = getStatus(dataApprove.recordset[0]?.Appr_DefinitionID);

      if (dataApprove.recordset1.length === 0) statusDokumen = "Approved";
      if (is_approve === false) statusDokumen = "Reject";

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
          statusDokumen: statusDokumen,
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

      const info = await transporter.sendMail({
        from: `[Notifikasi][Product Brief] - ${findProductBrief?.dataValues?.nama} <no_reply_it@lapilabs.co.id>`,
        to: ["gunardi.cahyadi@lapilabs.co.id", "cahyadigunardi@gmail.com"], // list of receivers
        subject: "Product Brief", // Subject line
        text: "Hellow world?", // plain text body
        html: `<b>
              <html>
              <p> Dear Bapak / Ibu di tempat,</p>
       <p> Bersamaan dengan email ini, diberitahukan bahwa Produk Brief “${findProductBrief?.dataValues?.nama}” dengan nomor: ${findProductBrief?.dataValues?.kode} telah diterima, mohon agar masing-masing bagian dapat melakukan kajian produk baru tersebut.</p>
       <br>
      </p>Demikian disampaikan, terima kasih atas perhatian dan kerjasamanya. </p>
      </p>eFormulation System </p>
              </html>
              </b>`,
      });

      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProductBrief;
