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

      let newRevisi;
      let newUpload = upload.filter((item) => item.trim() !== "");
      let productBriefKey;

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

      if (!productBrief) {
        throw new MyError(400, "Product Brief is required !");
      } else if (!kode) {
        throw new MyError(400, "Kode is required !");
      } else if (!nama) {
        throw new MyError(400, "Nama is required !");
      } else if (!kemasan) {
        throw new MyError(400, "Kemasan is required !");
      } else if (!bentukSediaan) {
        throw new MyError(400, "Bentuk Sediaan is required !");
      } else if (!ruangLingkup) {
        throw new MyError(400, "Ruang Lingkup is required !");
      } else if (!bahanAktifDanDosis || bahanAktifDanDosis.length === 0) {
        throw new MyError(
          400,
          "At least one bahanAktifDanDosis must be provided"
        );
      }

      if (existingProtokol) {
        productBriefKey = existingProtokol.productBriefKey;
      } else {
        const lastProductBrief = await t_productBrief.findOne({
          order: [["productBriefKey", "DESC"]],
        });

        productBriefKey = lastProductBrief
          ? lastProductBrief.productBriefKey + 1
          : 1;
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
        productBriefKey: productBriefKey,
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
      console.log(err);
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

      const size = page ? 10 : "";
      const { limit, offset } = getPagination(page, size);

      let productBriefKey = null;
      if (productBrief) {
        const briefResult = await t_productBrief.findOne({
          where: { productBrief: { [Op.iLike]: `%${productBrief}%` } },
          attributes: ["productBriefKey"],
        });
        if (briefResult) {
          productBriefKey = briefResult.productBriefKey;
        } else {
          return res
            .status(404)
            .json({ error: "No matching productBrief found" });
        }
      }

      const searchParams = {};
      if (productBriefKey) searchParams.productBriefKey = productBriefKey;
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
        searchParams.rdSelection = { [Op.iLike]: `%${rdSelection}%` };
      if (statusDokumen)
        searchParams.statusDokumen = { [Op.iLike]: `%${statusDokumen}%` };

      const brief = await t_productBrief.findAndCountAll({
        attributes: { exclude: ["upload"] }, // Adjust with actual column names
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        offset: size ? offset : "",
        totalPage: size ? Math.ceil(brief.count / limit) : "",
        brief,
      });
    } catch (err) {
      console.error(err); // Use console.error for better error logging
      res.status(500).json({ error: "Internal Server Error" }); // Provide a proper error response
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
        bagian_user === "AD" ||
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

      if (findProductBrief?.rdSelection === "RD1") {
        const info = await transporter.sendMail({
          from: `[Notifikasi][Product Brief] - ${findProductBrief?.dataValues?.nama} <no_reply_it@lapilabs.co.id>`,
          to: ["gunardi.cahyadi@lapilabs.co.id"], // list of receivers
          subject: "Product Brief", // Subject line
          text: "Hello world?", // plain text body
          html: `
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .email-container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #e0e0e0;
              }
              .header img {
                max-width: 150px;
              }
              .header h1 {
                font-size: 1.5em;
                margin: 0;
                color: #333333;
              }
              .content {
                padding: 20px 0;
                line-height: 1.6;
                color: #333333;
              }
              .content p {
                margin: 0 0 20px;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #777777;
                font-size: 0.9em;
              }
              .footer p {
                margin: 0;
              }
              .signature {
                margin-top: 20px;
                font-style: italic;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Product Brief Notification</h1>
              </div>
              <div class="content">
                <p>Dear Bapak / Ibu di tempat,</p>
                <p>
                  Bersamaan dengan email ini, diberitahukan bahwa Product Brief <b>“${findProductBrief?.dataValues?.nama}”</b> dengan nomor: <b>"${findProductBrief?.dataValues?.kode}"</b> telah diterima, mohon agar masing-masing bagian dapat melakukan kajian produk baru tersebut.
                </p>
                <p>Demikian disampaikan, terima kasih atas perhatian dan kerjasamanya.</p>
              </div>
              <div class="footer">
                <p>eFormulation System</p>
                <div class="signature">Lapi Labs</div>
              </div>
            </div>
          </body>
          </html>
          `,
        });
      } else {
        const info = await transporter.sendMail({
          from: `[Notifikasi][Product Brief] - ${findProductBrief?.dataValues?.nama} <no_reply_it@lapilabs.co.id>`,
          to: ["cahyadigunardi@gmail.com"], // list of receivers
          subject: "Product Brief", // Subject line
          text: "Hello world?", // plain text body
          html: `
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .email-container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                padding-bottom: 20px;
                border-bottom: 1px solid #e0e0e0;
              }
              .header img {
                max-width: 150px;
              }
              .header h1 {
                font-size: 1.5em;
                margin: 0;
                color: #333333;
              }
              .content {
                padding: 20px 0;
                line-height: 1.6;
                color: #333333;
              }
              .content p {
                margin: 0 0 20px;
              }
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                color: #777777;
                font-size: 0.9em;
              }
              .footer p {
                margin: 0;
              }
              .signature {
                margin-top: 20px;
                font-style: italic;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Product Brief Notification</h1>
              </div>
              <div class="content">
                <p>Dear Bapak / Ibu di tempat,</p>
                <p>
                  Bersamaan dengan email ini, diberitahukan bahwa Product Brief <b>“${findProductBrief?.dataValues?.nama}”</b> dengan nomor: <b>"${findProductBrief?.dataValues?.kode}"</b> telah diterima, mohon agar masing-masing bagian dapat melakukan kajian produk baru tersebut.
                </p>
                <p>Demikian disampaikan, terima kasih atas perhatian dan kerjasamanya.</p>
              </div>
              <div class="footer">
                <p>eFormulation System</p>
                <div class="signature">Lapi Labs</div>
              </div>
            </div>
          </body>
          </html>
          `,
        });
      }

      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProductBrief;
