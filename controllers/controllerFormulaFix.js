const {
  t_formulaFix,
  t_formulaFix_status,
  t_perhitunganBahanBakuFormulaFix,
  t_kemasanFormulaFix,
  t_formulaFix_prosesPengolahan,
  t_formulaFix_prosesPengemasan,
  t_formulaFix_rancanganSpesifikasiObatJadi,
  t_formulaFix_dataStabilitas,
  t_formulaFix_acuanCatatanTrial,
  sequelize,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusFormulaFix } = require("../helpers/checkStatus");
const { getStatusFormulaFix } = require("../helpers/statusFormulaFix");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");
const { fetchApproverInisial } = require("../services/mssqlService");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");
const puppeteer = require("puppeteer");
// const { verify } = require("../../LMS_BE/helpers/jwt");
const logoPath = path.resolve(__dirname, "../publicuploads/logos.png");
const logoBase64 = `data:image/png;base64,${fs
  .readFileSync(logoPath)
  .toString("base64")}`;

class ControllerFormulaFix {
  static async printFormulaFix(req, res) {
    const { link } = req.query;

    // console.log(type, "<< type");

    // const payload = verify(link);

    // console.log(payload.link, "< pay;oad");

    // const link2 = "" + payload.link;
    // const link2 =
    //   "http://localhost:5174/ePengembanganFormula-dev/catatan-trial/print/398/padat";

    // console.log(link2, "< link2");

    let browser;
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(link, { waitUntil: "networkidle0" });

      await page.addStyleTag({
        content: `
            * {
              font-size: 12px !important;
              font-family: Arial, sans-serif;
            }
          `,
      });

      // Membuat PDF dalam bentuk buffer
      const pdfBuffer = await page.pdf({
        format: "A4",
        displayHeaderFooter: true,
        printBackground: true,
        footerTemplate: `
            <table style="width: 90%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse;">
              <tr>
                <td style="border: 1px solid gray; width: 15%; text-align: center;">Nomor</td>
                <td style="border: 1px solid gray; width: 15%; text-align: center;">FO.RD</td>
                <td style="border: 1px solid gray; width: 15%; text-align: center;">Tanggal</td>
                <td style="border: 1px solid gray; width: 15%; text-align: center;">08/11/2019</td>
                <td style="border: 1px solid gray; width: 12.5%; text-align: center;">Revisi</td>
                <td style="border: 1px solid gray; width: 5%; text-align: center;">00</td>
                <td style="border: 1px solid gray; width: 12.5%; text-align: center;">Halaman</td>
                <td style="border: 1px solid gray; width: 10%; text-align: center;"><span class="pageNumber"></span> dari <span class="totalPages"></span></td>
              </tr>
            </table>
          `,
        headerTemplate: `
          <table style="width: 90%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
          <tr>
            <td style="border: 1px solid gray; width: 140px; height: 60px; text-align: center;">
              <img src="${logoBase64}" alt="lapilogo" width="100">
            </td>
            <td style="border: 1px solid gray; height: 60px; text-align: center;">
              <h1 style="font-weight: bold; font-size: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: Verdana, sans-serif;">
                <span>Formula Fix</span>
              </h1>
            </td>
          </tr>
        </table>
        
        
          `,
        margin: { bottom: "60px", top: "130px", left: "70px", right: "80px" },
      });

      await browser.close();

      res.end(pdfBuffer);
    } catch (error) {
      console.error("Error during printFormulaFix:", error);

      if (browser) await browser.close();

      res
        .status(500)
        .send({ error: "An error occurred during PDF generation." });
    }
  }

  static async createFormulaFix(req, res, next) {
    try {
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const flag_update = "UPDATE FOR DELETE";
      const {
        namaProduk,
        filter,
        komposisi,
        kemasan,
        formulaAcuan,
        bentukSediaan,
        besarBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
        formulaD,
        keterangan,
      } = req.body;

      const createFormulaFix = await t_formulaFix.create({
        namaProduk: namaProduk || "",
        filter: filter || "",
        komposisi: komposisi || "",
        kemasan: kemasan || "",
        formulaAcuan: formulaAcuan || "",
        bentukSediaan: bentukSediaan || "",
        besarBets: besarBets || "",
        revisi: revisi || "",
        alasan: alasan || "",
        filter: filter || "",
        formulaA: formulaA || "",
        formulaB: formulaB || "",
        formulaC: formulaC || "",
        formulaD: formulaD || "",
        keterangan: keterangan || "",
        pic: nama_user || "",
        bagian: bagian_user || "",
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Data has been saved!",
        data: createFormulaFix,
      });
    } catch (err) {
      next(err);
    }
  }

  static async findAllFormulaFix(req, res) {
    try {
      const {
        page,
        namaProduk,
        filter,
        komposisi,
        bentukSediaan,
        nomorBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (filter) searchParams.filter = { [Op.iLike]: `%${filter}%` };
      if (komposisi) searchParams.komposisi = { [Op.iLike]: `%${komposisi}%` };
      if (bentukSediaan)
        searchParams.bentukSediaan = { [Op.iLike]: `%${bentukSediaan}%` };
      if (nomorBets) searchParams.nomorBets = +nomorBets;
      if (revisi)
        searchParams.revisi = {
          [Op.iLike]: `%${revisi}%`,
        };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };
      if (formulaA)
        searchParams.formulaA = {
          [Op.iLike]: `%${formulaA}%`,
        };
      if (formulaB)
        searchParams.formulaB = {
          [Op.iLike]: `%${formulaB}%`,
        };
      if (formulaC)
        searchParams.formulaC = {
          [Op.iLike]: `%${formulaC}%`,
        };

      const formula = await t_formulaFix.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(formula.count / limit) : "",
        formula,
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async getFormulaFixDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;

      const { id } = req.params;

      let formulaFixDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        formulaFixDetails = await t_formulaFix?.findOne({
          where: {
            id,
          },
          include: { model: t_formulaFix_status, as: "approver_data" },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      } else {
        formulaFixDetails = await t_formulaFix.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_formulaFix_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      const apprDeptId = formulaFixDetails.bagian;
      const apprNo = await checkStatusFormulaFix(id);

      const isApprove = await isApproveValidation(
        "formulaFix",
        apprDeptId,
        apprNo,
        user_id
      );

      console.log(isApprove, "< isapprove");

      if (isApprove.message) throw new MyError(400, isApprove.message);

      res
        .status(200)
        .json({ ...(formulaFixDetails?.dataValues || {}), isApprove });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async updateFormulaFix(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const {
        namaProduk,
        filter,
        komposisi,
        kemasan,
        formulaAcuan,
        bentukSediaan,
        besarBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
        formulaD,
        keterangan,
      } = req.body;

      const [updatedRowsCount] = await t_formulaFix.update(
        {
          namaProduk: namaProduk || "",
          filter: filter || "",
          komposisi: komposisi || "",
          kemasan: kemasan || "",
          formulaAcuan: formulaAcuan || "",
          bentukSediaan: bentukSediaan || "",
          besarBets: besarBets || "",
          revisi: revisi || "",
          alasan: alasan || "",
          filter: filter || "",
          formulaA: formulaA || "",
          formulaB: formulaB || "",
          formulaC: formulaC || "",
          formulaD: formulaD || "",
          keterangan: keterangan || "",
        },
        {
          where: { id: id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Data has been saved!",
        });
      } else {
        res.status(404).json({
          message: "Formula Fix not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async approveFormulaFix(req, res, next) {
    try {
      const {
        user_id,
        nama_user,
        joblevel_id_user,
        inisial_user,
        delegated_to,
      } = req.user;
      const { is_approve, keterangan_reject = null } = req.body;
      const { id } = req.params;
      const findFormulaFix = await t_formulaFix.findByPk(+id);
      if (!findFormulaFix)
        throw new MyError(404, "Form formula fix tidak ditemukan");
      const apprNo = await checkStatusFormulaFix(id);
      console.log(apprNo, "< ap no");

      const dataApprove = await approverRecordset(
        "formulaFix",
        findFormulaFix.bagian,
        apprNo,
        user_id,
        nama_user
      );

      console.log(dataApprove, "< DAt ap");

      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let statusDokumen;

      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        statusDokumen = getStatusFormulaFix(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );

      console.log(dataApprove?.recordset[0]?.Appr_DefinitionID, " < appr");

      console.log(statusDokumen, "< STATUS");

      if (dataApprove.recordset1.length === 0) statusDokumen = "Approved";
      if (is_approve === false) {
        statusDokumen = "Reject";
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
      }

      await t_formulaFix_status.create({
        FormulaFixID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_formulaFix.update(
        {
          statusDokumen: statusDokumen,
          alasan_reject: keterangan_reject,
          user_id,
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

  static async getFormulaDetails(req, res, next) {
    try {
      const { id } = req.params;

      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;

      let formulaFixDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        formulaFixDetails = await t_formulaFix?.findOne({
          where: {
            id,
          },
          include: { model: t_formulaFix_status, as: "approver_data" },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      } else {
        formulaFixDetails = await t_formulaFix.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_formulaFix_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      const apprDeptId = formulaFixDetails?.bagian;
      const apprNo = await checkStatusFormulaFix(id);

      await Promise.all(
        formulaFixDetails.dataValues.approver_data.map(async (el, index) => {
          el.dataValues.approver_inisial = await fetchApproverInisial({
            user_id: el.user_id,
            delegated_to: el.delegated_to,
          });

          return el;
        })
      );

      const isApprove = await isApproveValidation(
        "formulaFix",
        apprDeptId,
        apprNo,
        user_id
      );

      if (isApprove.message) throw new MyError(400, isApprove.message);

      const perhitunganBahanBaku =
        await t_perhitunganBahanBakuFormulaFix.findAll({
          where: { FormulaFixID: id },
          order: [["id", "ASC"]],
        });

      const kemasanFormula = await t_kemasanFormulaFix.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });

      const kemasanFormulaFixGrouped = kemasanFormula.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const kemasanFormulaFix = Object.values(kemasanFormulaFixGrouped);

      const prosesPengolahan = await t_formulaFix_prosesPengolahan.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });
      const prosesPengemasan = await t_formulaFix_prosesPengemasan.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });
      const rancanganSpesifikasiObatJadi =
        await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
          where: { FormulaFixID: id },
          order: [["id", "ASC"]],
        });
      const dataStabilitas = await t_formulaFix_dataStabilitas.findOne({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });
      const acuanCatatanTrial = await t_formulaFix_acuanCatatanTrial.findOne({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        formulaFix: { ...(formulaFixDetails?.dataValues || {}), isApprove },
        perhitunganBahanBaku,
        kemasanFormulaFix,
        prosesPengolahan,
        prosesPengemasan,
        rancanganSpesifikasiObatJadi,
        dataStabilitas,
        acuanCatatanTrial,
      });
    } catch (error) {
      console.log(error);
      next(error);
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

      // Establish the connection
      await sql.connect(config);

      const request = new sql.Request();
      const { nama, kode } = req.query;

      // Define the main query with UNION inside a CTE (Common Table Expression)
      let query = `
        WITH CombinedItems AS (
          SELECT DISTINCT 
              ItemID AS Item_Id, 
              ItemName AS ItemName, 
              principle AS Produsen
          FROM 
              t_NP_Sample_Stock 
          WHERE 
              ItemID IS NOT NULL 
              AND ItemID <> '' 
              AND ItemID <> '-'
  
          UNION 
  
          SELECT 
              a.item_id AS Item_Id, 
              b.item_name AS ItemName, 
              c.prc_name AS Produsen 
          FROM 
              m_item_manufacturing_supplier a
          LEFT JOIN 
              m_item_manufacturing b ON a.item_id = b.item_id
          LEFT JOIN 
              m_principle c ON a.item_prcid = c.prc_id
          LEFT JOIN 
              m_supplier d ON a.item_suppid = d.supp_id
          WHERE 
              a.isactive = 1
              AND b.isactive = 1 
              AND c.isactive = 1 
              AND d.isactive = 1 
              AND b.item_type = 'BB'
        )
        SELECT * FROM CombinedItems WHERE 1=1
      `;

      // Add dynamic filters if parameters are provided
      if (nama) {
        query += ` AND ItemName = @nama `;
        request.input("nama", sql.VarChar, nama);
      }
      if (kode) {
        query += ` AND Item_Id = @kode `;
        request.input("kode", sql.VarChar, kode);
      }

      query += ` ORDER BY Item_Id, Produsen;`;

      const { recordset } = await request.query(query);

      if (recordset.length === 0) {
        return res.status(404).json({ message: "Produsen not found" });
      }

      // Send the result
      res.status(200).json(recordset);
    } catch (err) {
      console.error("Error in findNamaBahanBaku:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async findAllKomposisi(req, res) {
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

      // Establish the connection
      await sql.connect(config);

      const request = new sql.Request();
      const { product_id } = req.query; // Expecting product_id from query params

      let query = `
        SELECT 
          pb.Product_BahanAktif,
          pb.Product_Dosis
        FROM m_product_bahanaktif pb
        LEFT JOIN m_PRODUCT p ON p.Product_ID = pb.Product_ID
        WHERE p.isActive = 1
      `;

      // If product_id is provided, filter by it
      if (product_id) {
        query += ` AND p.Product_ID = @product_id `;
        request.input("product_id", sql.VarChar, product_id); // Input parameter
      } else {
        // Default to product_id '01' if no product_id is provided
        query += ` AND p.Product_ID = '01' `;
      }

      const { recordset } = await request.query(query);

      if (recordset.length === 0) {
        return res.status(404).json({
          message: "No active ingredients found for the specified product",
        });
      }

      // Format the response as an array of objects
      const formattedList = recordset.map((item) => ({
        dosis: item.Product_Dosis.trim(), // Dosis property
        bahanAktif: item.Product_BahanAktif.trim(), // BahanAktif property
      }));

      // Send the formatted list
      res.status(200).json(formattedList);
    } catch (err) {
      console.error("Error in findAllKomposisi:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async handleSavePerhitunganBahanBaku(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;

      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      if (formula?.statusDokumen === "Reject") {
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
        await t_formulaFix.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevPerhitungan = await t_perhitunganBahanBakuFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevPerhitungan?.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id)?.map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          if (!newItem?.id) {
            const created = await t_perhitunganBahanBakuFormulaFix.create(
              {
                title: newItem?.title || "",
                headers: newItem?.headers || null,
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_perhitunganBahanBakuFormulaFix.update(
              {
                title: newItem?.title || "",
                headers: newItem?.headers || null,
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_perhitunganBahanBakuFormulaFix.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_perhitunganBahanBakuFormulaFix.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_perhitunganBahanBakuFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "Data has been saved!",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKemasanFormulaFix(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const flag_update = "UPDATE FOR DELETE";
      const { id } = req.params;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const formula = await t_formulaFix.findByPk(+id);

      if (formula?.statusDokumen === "Reject") {
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
        await t_formulaFix.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKemasan = await t_kemasanFormulaFix.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKemasan.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_kemasanFormulaFix.create(
              {
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                tableIndex: newItem?.tableIndex ?? null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_kemasanFormulaFix.update(
              {
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                tableIndex: newItem?.tableIndex ?? null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_kemasanFormulaFix.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_kemasanFormulaFix.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kemasanFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "Data has been saved!",
        data: newData,
      });
    } catch (err) {
      console.log(err);

      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveProsesPengolahan(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;

      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      if (formula?.statusDokumen === "Reject") {
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
        await t_formulaFix.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevProsesPengolahan = await t_formulaFix_prosesPengolahan.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevProsesPengolahan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_formulaFix_prosesPengolahan.create(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_prosesPengolahan.update(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_formulaFix_prosesPengolahan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_prosesPengolahan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_prosesPengolahan.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "Data has been saved!",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveProsesPengemasan(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;

      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      if (formula?.statusDokumen === "Reject") {
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
        await t_formulaFix.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevProsesPengemasan = await t_formulaFix_prosesPengemasan.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevProsesPengemasan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_formulaFix_prosesPengemasan.create(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_prosesPengemasan.update(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_formulaFix_prosesPengemasan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_prosesPengemasan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_prosesPengemasan.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "Data has been saved!",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveRancanganSpesifikasiObatJadi(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      if (formula?.statusDokumen === "Reject") {
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
        await t_formulaFix.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevRancangan =
        await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
          where: {
            FormulaFixID: id,
          },
          order: [["id", "ASC"]],
        });

      const existing = prevRancangan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created =
              await t_formulaFix_rancanganSpesifikasiObatJadi.create(
                {
                  parameter: newItem?.parameter || "",
                  spesifikasi: newItem?.spesifikasi || "",
                  referensi: newItem?.referensi || "",
                  justifikasi: newItem?.justifikasi || "",
                  FormulaFixID: +id || null,
                  user_id,
                  delegated_to,
                },
                { transaction }
              );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_rancanganSpesifikasiObatJadi.update(
              {
                parameter: newItem?.parameter || "",
                spesifikasi: newItem?.spesifikasi || "",
                referensi: newItem?.referensi || "",
                justifikasi: newItem?.justifikasi || "",
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_formulaFix_rancanganSpesifikasiObatJadi.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_rancanganSpesifikasiObatJadi.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  static async updateDataStabilitas(req, res) {
    try {
      const { FormulaFixID } = req.params;
      const { user_id, delegated_to } = req.user;

      const upload = req.body;

      // Try to find the record by FormulaFixID
      let [dataStabilitas, created] =
        await t_formulaFix_dataStabilitas.findOrCreate({
          where: { FormulaFixID: +FormulaFixID },
          defaults: { upload },
          user_id,
          delegated_to,
        });

      if (!created) {
        // If the record exists, update it
        dataStabilitas = await dataStabilitas.update({
          upload,
          user_id,
          delegated_to,
        });
        console.log("Record updated:", dataStabilitas);
      } else {
        console.log("Record created:", dataStabilitas);
      }

      res.status(200).json(dataStabilitas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
  static async getUploadDataStabilitas(req, res) {
    try {
      const { id } = req.params;

      const upload = await t_formulaFix_dataStabilitas.findOne({
        where: { FormulaFixID: +id },
      });

      res.json(upload); // Send the processed upload data
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching images" });
    }
  }
  static async updateAcuanCatatanTrial(req, res) {
    try {
      const { FormulaFixID } = req.params;
      const { user_id, delegated_to } = req.user;

      const upload = req.body;

      // Try to find the record by FormulaFixID
      let [acuanCatatanTrial, created] =
        await t_formulaFix_acuanCatatanTrial.findOrCreate({
          where: { FormulaFixID: +FormulaFixID },
          defaults: { upload },
          user_id,
          delegated_to,
        });

      if (!created) {
        // If the record exists, update it
        acuanCatatanTrial = await acuanCatatanTrial.update({
          upload,
          user_id,
          delegated_to,
        });
        console.log("Record updated:", acuanCatatanTrial);
      } else {
        console.log("Record created:", acuanCatatanTrial);
      }

      res.status(200).json(acuanCatatanTrial);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
  static async getUploadAcuanCatatanTrial(req, res) {
    try {
      const { id } = req.params;

      const upload = await t_formulaFix_acuanCatatanTrial.findOne({
        where: { FormulaFixID: +id },
      });

      res.json(upload); // Send the processed upload data
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching images" });
    }
  }

  // static async deleteFormulaFix(req, res) {
  //   try {
  //     const { id } = req.params;

  //     await t_formulaFix.destroy({
  //       where: { id: +id }, // Corrected the where clause
  //     });

  //     res.status(200).send({ msg: "succeed" });
  //   } catch (err) {
  //     console.log(err);
  //     res.status(500).send({ msg: "error" });
  //   }
  // }

  static async deleteFormulaFix(req, res) {
    try {
      const { id } = req.params;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
      } = req.user;

      const flag_update = "UPDATE FOR DELETE";

      const findFormulaFix = await t_formulaFix.findByPk(+id);
      if (!findFormulaFix)
        throw new MyError(404, "Form Formula Fix tidak di temukan");

      // First, update all related records
      await t_formulaFix_status.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_perhitunganBahanBakuFormulaFix.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_kemasanFormulaFix.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_formulaFix_prosesPengolahan.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_formulaFix_prosesPengemasan.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_formulaFix_rancanganSpesifikasiObatJadi.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_formulaFix_dataStabilitas.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );
      await t_formulaFix_acuanCatatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { FormulaFixID: +id } }
      );

      // Next, delete all related records
      await t_formulaFix_status.destroy({ where: { FormulaFixID: +id } });
      await t_perhitunganBahanBakuFormulaFix.destroy({
        where: { FormulaFixID: +id },
      });
      await t_kemasanFormulaFix.destroy({
        where: { FormulaFixID: +id },
      });
      await t_formulaFix_prosesPengolahan.destroy({
        where: { FormulaFixID: +id },
      });
      await t_formulaFix_prosesPengemasan.destroy({
        where: { FormulaFixID: +id },
      });
      await t_formulaFix_rancanganSpesifikasiObatJadi.destroy({
        where: { FormulaFixID: +id },
      });
      await t_formulaFix_dataStabilitas.destroy({
        where: { FormulaFixID: +id },
      });
      await t_formulaFix_acuanCatatanTrial.destroy({
        where: { FormulaFixID: +id },
      });

      // Finally, update and delete the main record
      await t_formulaFix.update(
        { user_id, delegated_to, flag_update },
        { where: { id: +id } }
      );
      await t_formulaFix.destroy({ where: { id: +id } });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerFormulaFix;
