const {
  m_kodeTrialObatJadi_template,
  m_kodeTrialObatJadi,
  sequelize,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const m_kodetrialobatjadi = require("../models/m_kodetrialobatjadi");
const { Sequelize, Op } = require("sequelize");
const { isApproveValidation } = require("../helpers/approver");
const { mssqlSequeliez } = require("../config/configMssql");
const { PDFDocument, rgb } = require("pdf-lib");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const logoPath = path.resolve(__dirname, "../publicuploads/logos.png");
const logoBase64 = `data:image/png;base64,${fs
  .readFileSync(logoPath)
  .toString("base64")}`;

class ControllerKodeTrialObatJadi {
static async printKodeTrialObatJadi(req, res) {
  const { token, link, revisi, rencana_berlaku } = req.query;

  function formatTanggalBerikut(rencana_berlaku) {
    const d = new Date(rencana_berlaku);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  }

  const formattedTanggal = formatTanggalBerikut(rencana_berlaku);

  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      authentication: token,
    });

    await page.goto(link, { waitUntil: "networkidle0" });

    await page.addStyleTag({
      content: `
            * {
              font-size: 12px !important;
              font-family: Arial, sans-serif;
            }
          `,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: `   `,
      headerTemplate: `
<table style="width: 90%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
  <tr>

    <td style="border: 1px solid gray; width: 140px; height: 100px; text-align: center;" rowspan="2">
      <img src="${logoBase64}" alt="lapilogo" width="100">

    </td>


    <td style="border: 1px solid black; text-align: start; height: 19px; padding-left: 10px; font-weight: bold;">
      DAFTAR
    </td>


    <td style="width: 220px; height: 120px; border: 1px solid black; vertical-align: top;" rowspan="2">
      <div style="width: 100%; height: 100%; font-size: 11px; display: flex; flex-direction: column;">


        <div style="display: flex; border-bottom: 1px solid black; min-height: 28px;">
          <div style="width: 50%; padding: 5px 4px; border-right: 1px solid black;">Nomor</div>
          <div style="width: 50%; padding: 5px 4px;">DA.RD.000003</div>
        </div>


        <div style="display: flex; border-bottom: 1px solid black; min-height: 40px;">
          <div style="width: 50%; padding: 8px 4px; border-right: 1px solid black;">Tanggal Berlaku</div>
          <div style="width: 50%; padding: 8px 4px;"></div>
        </div>


        <div style="display: flex; border-bottom: 1px solid black; min-height: 40px;">
          <div style="width: 50%; padding: 8px 4px; border-right: 1px solid black;">Tanggal Review</div>
          <div style="width: 50%; padding: 8px 4px;"></div>
        </div>


        <div style="display: flex; border-bottom: 1px solid black; min-height: 28px;">
          <div style="width: 50%; padding: 5px 4px; border-right: 1px solid black;">Revisi</div>
          <div style="width: 50%; padding: 5px 4px;">${revisi}</div>
        </div>


        <div style="display: flex; min-height: 28px;">
          <div style="width: 50%; padding: 5px 4px; border-right: 1px solid black;">Halaman</div>
          <div style="width: 50%; padding: 5px 4px;">
            <span class="pageNumber">1</span> dari <span class="totalPages">13</span>
          </div>
        </div>

      </div>
    </td>
  </tr>


  <tr>
    <td style="border: 1px solid gray; height: 98px; text-align: center; font-weight: bold;">
      KODE TRIAL OBAT JADI
    </td>
  </tr>
</table>


      `,
      margin: { bottom: "60px", top: "200px", left: "40px", right: "40px" },
    });

    await browser.close();

    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error during printCatatanTrial:", error);

    if (browser) await browser.close();

    res.status(500).send({ error: "An error occurred during PDF generation." });
  }
}

  static async createKodeTrialObatJadiTemplate(req, res, next) {
    try {
      const {
        kodeProduk,
        namaObatJadi,
        kemasan,
        komposisi,
        keterangan,
        rencana_berlaku,
        rencana_revisi,
      } = req.body;

      const existingObatJadi = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } }, // Check if user_approve is null or empty
            { user_delegated: { [Op.or]: [null, ""] } }, // Check if user_delegated is null or empty
            { user_approve_date: { [Op.is]: null } }, // Check if user_approve_date is null
          ],
        },
        order: [["createdAt", "DESC"]],
      });

      if (
        existingObatJadi?.find(
          (obatJadi) => obatJadi?.kodeProduk === kodeProduk
        )
      ) {
        throw new MyError(400, "Kode Produk Sudah Ada!");
      }

      const { user_id, delegated_to } = req.user;

      const createKodeTrialObatJadiTemplate =
        await m_kodeTrialObatJadi_template.create({
          kodeProduk: kodeProduk,
          namaObatJadi: namaObatJadi,
          kemasan: kemasan,
          komposisi: komposisi,
          keterangan: keterangan,
          rencana_berlaku: rencana_berlaku,
          rencana_revisi: rencana_revisi,
          user_id,
          delegated_to,
        });

      res.status(201).json({
        message: "Data has been saved",
        data: createKodeTrialObatJadiTemplate,
      });
    } catch (err) {
      console.error(err, "<< err");
      next(err);
    }
  }
  static async getKodeTrialObatJadi(req, res) {
    try {
      const kodeTrialObatJadi = await m_kodeTrialObatJadi.findAll({
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        kodeTrialObatJadi,
      });
    } catch (err) {
      console.error(err); // Use console.error for better error logging
      res.status(500).json({ error: "Internal Server Error" }); // Provide a proper error response
    }
  }

  static async getKodeTrialObatJadiTemplate(req, res) {
    try {
      const kodeTrialObatJadi = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } },
            { user_delegated: { [Op.or]: [null, ""] } },
            { user_approve_date: { [Op.is]: null } },
          ],
        },
        order: [["id", "ASC"]],
      });

      const indexTerakhir = kodeTrialObatJadi?.length - 1;
      const lastUserId = kodeTrialObatJadi?.[indexTerakhir]?.user_id;


      if (lastUserId && indexTerakhir >= 0) {
        const [results] = await mssqlSequeliez.query(
          `
    SELECT Nama, Jabatan 
    FROM m_karyawan 
    WHERE inisialName = :lastUserId AND isActive = 1
  `,
          {
            replacements: { lastUserId },
            type: mssqlSequeliez.QueryTypes.SELECT,
          }
        );

        const karyawanName = results?.Nama || null;
        const karyawanJabatan = results?.Jabatan || null;

        // Masukkan Nama dan Jabatan ke dalam item terakhir
        kodeTrialObatJadi[indexTerakhir].dataValues.karyawanName = karyawanName;
        kodeTrialObatJadi[indexTerakhir].dataValues.karyawanJabatan =
          karyawanJabatan;
      }

      res.status(200).json({
        kodeTrialObatJadi,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async getAllRevisiDetail(req, res) {
    try {
      const { revisi } = req.query;

      // Step 1: Ambil MAX(id) per kombinasi grup
      const maxIdRows = await m_kodeTrialObatJadi_template.findAll({
        attributes: [[Sequelize.fn("MAX", Sequelize.col("id")), "maxId"]],
        where: {
          rencana_revisi: {
            [Op.lte]: revisi,
          },
        },
        group: ["rencana_revisi", "rencana_berlaku", "rencana_alasan_desc"],
        raw: true,
      });

      // Ambil array id-nya saja
      const maxIds = maxIdRows.map((row) => row.maxId);

      // Step 2: Ambil semua baris berdasarkan id tersebut
      const revisiDetails = await m_kodeTrialObatJadi_template.findAll({
        attributes: [
          "rencana_revisi",
          "rencana_berlaku",
          "rencana_alasan_desc",
          "user_id",
        ],
        where: {
          id: {
            [Op.in]: maxIds,
          },
        },
        order: [["rencana_revisi", "DESC"]],
      });

      res.status(200).json({ revisiDetails });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  static async revisiKodeTrialObatJadi(req, res) {
    const { revisi } = req.query; // Get revisi from the query parameters

    try {
      const kodeTrialObatJadi = await m_kodeTrialObatJadi_template.findAll({
        where: {
          rencana_revisi: revisi, // Directly use the field for filtering
        },
        order: [["id", "ASC"]],
      });

      const indexTerakhir = kodeTrialObatJadi?.length - 1;

      const lastUserId = kodeTrialObatJadi?.[indexTerakhir]?.user_id;


      if (lastUserId && indexTerakhir >= 0) {
        const [results] = await mssqlSequeliez.query(
          `
    SELECT Nama, Jabatan 
    FROM m_karyawan 
    WHERE inisialName = :lastUserId AND isActive = 1
  `,
          {
            replacements: { lastUserId },
            type: mssqlSequeliez.QueryTypes.SELECT,
          }
        );

        const karyawanName = results?.Nama || null;
        const karyawanJabatan = results?.Jabatan || null;

        // Masukkan Nama dan Jabatan ke dalam item terakhir
        kodeTrialObatJadi[indexTerakhir].dataValues.karyawanName = karyawanName;
        kodeTrialObatJadi[indexTerakhir].dataValues.karyawanJabatan =
          karyawanJabatan;
      }

      res.status(200).json({
        kodeTrialObatJadi,
      });
    } catch (err) {
      console.error(err); // Use console.error for better error logging
      res.status(500).json({ error: "Internal Server Error" }); // Provide a proper error response
    }
  }

  static async approveKodeTrialObatJadi(req, res, next) {
    try {
      const { user_id, bagian_user, delegated_to } = req.user;

      const apprDeptId = bagian_user;
      const apprNo = 1;

      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } },
            { user_delegated: { [Op.or]: [null, ""] } },
            { user_approve_date: { [Op.is]: null } },
          ],
        },
        order: [["id", "ASC"]],
      });

      if (existingRecords.length === 0) {
        throw new MyError(400, "Not Found!");
      }

      const applicationCode = existingRecords[0].applicationCode;

      const isApprove = await isApproveValidation(
        applicationCode,
        apprDeptId,
        apprNo,
        user_id
      );



      if (isApprove === true) {
        const incompleteRecords = existingRecords.filter(
          (record) => !record.rencana_berlaku || !record.rencana_revisi
        );

        if (incompleteRecords.length > 0) {
          throw new MyError(400, "Rencana Berlaku belum !");
        }

        const updatedRecords = await Promise.all(
          existingRecords.map(async (record) => {
            try {
              return await record.update({
                user_approve: user_id,
                user_delegated: delegated_to,
                user_approve_date: new Date(),
              });
            } catch (updateError) {
              console.error(
                `Error updating record with ID ${record.id}:`,
                updateError
              );
              throw updateError;
            }
          })
        );

        const newTemplate = existingRecords.map((el) => ({
          kodeProduk: el.kodeProduk,
          namaObatJadi: el.namaObatJadi,
          kemasan: el.kemasan,
          komposisi: el.komposisi,
          keterangan: el.keterangan,
          user_id: "Sys",
          delegated_to: "Sys",
        }));

        const highestIdItem = updatedRecords.reduce(
          (max, el) => (el.id > max.id ? el : max),
          updatedRecords[0]
        );

        const newRecords = updatedRecords.map((el) => ({
          kodeProduk: el.kodeProduk,
          namaObatJadi: el.namaObatJadi,
          kemasan: el.kemasan,
          komposisi: el.komposisi,
          keterangan: el.keterangan,
          rencana_berlaku: el.rencana_berlaku,
          rencana_revisi: el.rencana_revisi,
          rencana_alasan_desc: el.rencana_alasan_desc,
          selected_manager: el.selected_manager,
          applicationCode: el.applicationCode,
          user_id: highestIdItem.user_id,
          delegated_to: highestIdItem.delegated_to,
        }));

        await m_kodeTrialObatJadi_template.bulkCreate(newTemplate);

        const templateFix = await m_kodeTrialObatJadi.findAll();

        if (existingRecords.length > 0) {
          await m_kodeTrialObatJadi.destroy({
            truncate: true,
          });
        }

        await m_kodeTrialObatJadi.bulkCreate(newRecords);

        res.status(200).json({
          message: "Data has been updated",
          data: updatedRecords,
        });
      } else {
        throw new MyError(400, "User no Access");
      }
    } catch (err) {
      console.error("Error in approveKodeTrialObatJadi:", err);
      next(err);
    }
  }

  static async updateRencanaBerlaku(req, res, next) {
    try {
      const { user_id, delegated_to } = req.user;
      const {
        rencana_berlaku,
        rencana_revisi,
        rencana_alasan_desc,
        selected_manager,
        applicationCode,
      } = req.body;


      // Validate the input
      if (!rencana_berlaku || !rencana_alasan_desc) {
        return res.status(400).json({
          message: "Missing required fields",
        });
      }

      // Find records that need updating
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.is]: null } },
            { user_delegated: { [Op.is]: null } },
            { user_approve_date: { [Op.is]: null } },
          ],
        },
        order: [["createdAt", "ASC"]],
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      // Update the records
      const updatedRecords = await Promise.all(
        existingRecords.map((record) =>
          record.update({
            rencana_berlaku,
            rencana_revisi,
            rencana_alasan_desc,
            selected_manager,
            applicationCode,
          })
        )
      );

      res.status(200).json({
        message: "Data has been updated",
        data: updatedRecords,
      });
    } catch (err) {
      console.error("Error in updateRencanaBerlaku:", err);
      next(err);
    }
  }
  static async latestKodeTrialObatJadi(req, res, next) {
    try {
      const { user_id, bagian_user, delegated_to } = req.user;

      // Find the existing records
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } },
            { user_delegated: { [Op.or]: [null, ""] } },
            { user_approve_date: { [Op.is]: null } },
          ],
        },
        order: [["id", "ASC"]],
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      // Ambil applicationCode dari record pertama
      const applicationCode = existingRecords[0].applicationCode;



      const apprDeptId = bagian_user;
      const apprNo = 1;

      const isApprove = await isApproveValidation(
        applicationCode,
        apprDeptId,
        apprNo,
        user_id
      );

      res.status(200).json({
        message: "Data has been updated",
        data: existingRecords,
        isApprove,
      });
    } catch (err) {
      console.error("Error in latestKodeTrialObatJadi:", err);
      next(err);
    }
  }

  static async editKodeTrialObatJadiTemplate(req, res, next) {
    try {
      const { id, kodeProduk, namaObatJadi, kemasan, komposisi, keterangan } =
        req.body;

      const [updatedRowsCount] = await m_kodeTrialObatJadi_template.update(
        {
          kodeProduk: kodeProduk,
          namaObatJadi: namaObatJadi,
          kemasan: kemasan,
          komposisi: komposisi,
          keterangan: keterangan,
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
          message: "Kode Trial not found",
        });
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  static async deleteKodeTrialObatJadiTemplate(req, res, next) {
    try {
      const { id } = req.body;

      const deletedRowsCount = await m_kodeTrialObatJadi_template.destroy({
        where: { id: id },
      });

      if (deletedRowsCount > 0) {
        res.status(200).json({
          message: "Data has been deleted successfully!",
        });
      } else {
        res.status(404).json({
          message: "Kode Trial not found",
        });
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  static async allRevisiKodeTrialObatJadiTemplate(req, res, next) {
    try {
      // Find distinct rencana_revisi values
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        attributes: [
          [
            Sequelize.fn("DISTINCT", Sequelize.col("rencana_revisi")),
            "rencana_revisi",
          ],
        ], // Select distinct rencana_revisi
        where: {
          rencana_revisi: {
            [Op.ne]: null, // Filter out records where rencana_revisi is null
          },
        },
        // Remove the order clause as it's not allowed with DISTINCT
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      // Optionally sort the results in JavaScript if necessary
      const distinctRevisis = existingRecords
        .map((record) => record.rencana_revisi)
        .sort();

      res.status(200).json({
        message: "Data has been updated",
        data: distinctRevisis, // Return the sorted distinct rencana_revisi
      });
    } catch (err) {
      console.error("Error in allRevisiKodeTrialObatJadiTemplate:", err);
      next(err);
    }
  }
}

module.exports = ControllerKodeTrialObatJadi;
