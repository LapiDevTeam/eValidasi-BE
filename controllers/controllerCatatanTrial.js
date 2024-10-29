const {
  t_catatanTrial,
  t_komposisiCatatanTrial,
  t_perhitunganZatAktif,
  t_metodePembuatan,
  t_prosesCatatanTrialPadat,
  t_prosesCatatanTrialPenyalutan,
  t_formulaCatatanTrial,
  t_pengamatanAwalCair,
  t_pengamatanLanjutan,
  t_pengamatanAwalPadat,
  t_pengamatanAwalSteril,
  t_pengamatanAwalPenyalutan,
  t_evaluasiBulk,
  t_distribusiUkuranPartikel,
  t_catatanTrial_status,
  m_bentuk_sediaan,
  m_kodeTrialObatJadi,
  sequelize,
} = require("../models/index");

const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusCatatanTrial } = require("../helpers/checkStatus");
const { getStatusCatatanTrial } = require("../helpers/statusCatatanTrial");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");
const { fetchApproverInisial } = require("../services/mssqlService");
const path = require("path");
const fs = require("fs");
const { generateAndReadTest } = require("../helpers/pdf.helper");
const { PDFDocument, rgb } = require("pdf-lib");

class ControllerCatatanTrial {
  static async addPageNumbersToHalaman(req, res) {
    const { inputPath, outputPath } = req.body;

    try {
      const fileName = path.basename(inputPath);

      let resultOCR = await generateAndReadTest(fileName);

      const existingPdfBytes = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const totalPages = pdfDoc.getPageCount();

      // KORD POTRAIT DSINI
      const halamanX = 515;
      const halamanY = 35;

      // KORD LANDSKEP DSINI
      const halamanX2 = 860;
      const halamanY2 = 747;

      for (let i = 0; i < totalPages; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        const isOCRPage = resultOCR.includes(i + 1);

        if (isOCRPage) {
          // Check if it's the last page
          if (i + 1 === totalPages) {
            page.drawText(`${i + 1} of ${totalPages}`, {
              x: halamanX2,
              y: halamanY2,
              size: 8.5,
              color: rgb(0, 0, 0),
              rotate: degrees(90),
            });
          }
        } else {
          page.drawText(`${i + 1} of ${totalPages}`, {
            x: halamanX,
            y: halamanY,
            size: 8.5,
            color: rgb(0, 0, 0),
          });
        }
      }
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);

      const absoluteOutputPath = path.resolve(outputPath);

      res.sendFile(absoluteOutputPath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).json({ error: "Failed to send the modified PDF." });
        } else {
          console.log("File sent successfully");
        }
      });
    } catch (error) {
      console.error("Error adding page numbers:", error);
      res
        .status(500)
        .json({ error: "Failed to add page numbers to Halaman box." });
    }
  }

  static async uploadPDFpublic(req, res) {
    const resp = {
      error: true,
      msg: "Terjadi kendala",
    };

    try {
      if (!req.file) {
        throw new Error("No file uploaded.");
      }

      if (req.file.mimetype !== "application/pdf") {
        throw new Error("Hanya file dengan format .pdf yang diperbolehkan.");
      }

      const ext = path.extname(req.file.originalname); // Get file extension
      const oldFn = req.file.path; // Temporary file path
      const fn = req.file.md5 + ext; // New file name using md5 hash
      const newFn = path.join(req.file.destination, "pdf-" + fn); // Absolute path of the new file
      req.file.newFn = newFn;

      // Rename the file to the new path
      await fs.promises.rename(oldFn, newFn);

      let protocol = req.protocol;
      let host = req.get("host");
      let url = `${protocol}://${host}`;

      // if (IMG_URL) {
      //   url = IMG_URL; // Use predefined URL if available
      // }

      const resp = {
        error: false,
        msg: "File berhasil diunggah",
        url: `${url}/api/v1/upload/file/${fn}`, // URL for accessing the file
        filename: "pdf-" + fn, // Return the actual file path on the server
      };

      return res.status(200).send(resp); // Send the response with file info
    } catch (error) {
      console.log({ error, msg: "@uploadPDFpublic.controller" });
      resp.msg = error.message || "Terjadi kendala";
      return res.status(500).json(resp);
    }
  }

  static async handleDuplicate(req, res, next) {
    console.log("xixixi");
    const { id } = req.params;
    console.log(id, "< id");

    try {
      // Step 1: Fetch data from all tables where CatatanTrialID matches the given id
      const catatanTrial = await t_catatanTrial.findOne({
        where: { id: +id },
      });
      const komposisiCatatanTrial = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });
      const perhitunganZatAktif = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: +id },
      });
      const formulaCatatanTrial = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });
      const metodePembuatan = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: +id },
      });
      const prosesPadat = await t_prosesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: +id },
      });
      const prosesPenyalutan = await t_prosesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: +id },
      });
      const evaluasiBulk = await t_evaluasiBulk.findAll({
        where: { CatatanTrialID: +id },
      });
      const distribusiUkuranPartikel = await t_distribusiUkuranPartikel.findOne(
        { where: { CatatanTrialID: +id } }
      );
      const pengamatanAwalPadat = await t_pengamatanAwalPadat.findAll({
        where: { CatatanTrialID: +id },
      });
      const pengamatanLanjutan = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: +id },
      });

      const pengamatanAwalCair = await t_pengamatanAwalCair.findAll({
        where: { CatatanTrialID: +id },
      });

      const pengamatanAwalSteril = await t_pengamatanAwalSteril.findAll({
        where: { CatatanTrialID: +id },
      });
      const pengamatanAwalPenyalutan = await t_pengamatanAwalPenyalutan.findAll(
        { where: { CatatanTrialID: +id } }
      );

      // Step 2: Duplicate each record
      if (catatanTrial) {
        // Convert Sequelize instance to plain object to modify it
        const catatanTrialData = catatanTrial.toJSON();

        // Delete the 'id' and 'statusDokumen' fields
        delete catatanTrialData.id;
        delete catatanTrialData.statusDokumen;
        delete catatanTrialData.upload;

        // Create a new record with the modified data and capture the new record
        const newCatatanTrial = await t_catatanTrial.create({
          ...catatanTrialData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // If komposisiCatatanTrial exists, create the new komposisi record
        if (komposisiCatatanTrial && komposisiCatatanTrial.length > 0) {
          for (const komposisi of komposisiCatatanTrial) {
            // Convert each Sequelize instance to plain object to modify it
            const komposisiData = komposisi.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete komposisiData.id;
            delete komposisiData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_komposisiCatatanTrial.create({
              ...komposisiData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // Fetch perhitunganZatAktif associated with the current CatatanTrialID
        const perhitunganZatAktif = await t_perhitunganZatAktif.findAll({
          where: { CatatanTrialID: +id },
        });

        // If perhitunganZatAktif exists, create the new perhitungan record
        if (perhitunganZatAktif && perhitunganZatAktif.length > 0) {
          for (const perhitungan of perhitunganZatAktif) {
            // Convert each Sequelize instance to plain object to modify it
            const perhitunganData = perhitungan.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete perhitunganData.id;
            delete perhitunganData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_perhitunganZatAktif.create({
              ...perhitunganData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // If formulaCatatanTrial exists, create the new formula records
        if (formulaCatatanTrial && formulaCatatanTrial.length > 0) {
          for (const formula of formulaCatatanTrial) {
            // Convert each Sequelize instance to plain object to modify it
            const formulaData = formula.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete formulaData.id;
            delete formulaData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_formulaCatatanTrial.create({
              ...formulaData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        if (metodePembuatan && metodePembuatan.length > 0) {
          for (const metode of metodePembuatan) {
            // Convert each Sequelize instance to plain object to modify it
            const metodeData = metode.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete metodeData.id;
            delete metodeData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_metodePembuatan.create({
              ...metodeData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // If prosesPadat exists, create the new proses record
        if (prosesPadat && prosesPadat.length > 0) {
          for (const proses of prosesPadat) {
            // Convert each Sequelize instance to plain object to modify it
            const prosesData = proses.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete prosesData.id;
            delete prosesData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_prosesCatatanTrialPadat.create({
              ...prosesData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // If prosesPenyalutan exists, create the new proses record
        if (prosesPenyalutan && prosesPenyalutan.length > 0) {
          for (const proses of prosesPenyalutan) {
            // Convert each Sequelize instance to plain object to modify it
            const prosesData = proses.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete prosesData.id;
            delete prosesData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_prosesCatatanTrialPenyalutan.create({
              ...prosesData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        // If evaluasiBulk exists, create the new evaluasi record
        if (evaluasiBulk && evaluasiBulk.length > 0) {
          for (const evaluasi of evaluasiBulk) {
            // Convert each Sequelize instance to a plain object to modify it
            const evaluasiData = evaluasi.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete evaluasiData.id;
            delete evaluasiData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_evaluasiBulk.create({
              ...evaluasiData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        if (distribusiUkuranPartikel) {
          const distribusiData = distribusiUkuranPartikel.toJSON();

          // Delete the 'id' and 'statusDokumen' fields
          delete distribusiData.id;
          delete distribusiData.CatatanTrialID;

          // Create a new record with the modified data and capture the new record
          const newDistribusiData = await t_distribusiUkuranPartikel.create({
            ...distribusiData,
            CatatanTrialID: newCatatanTrial.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Optionally, return or do something with newDistribusiData here
        }

        // If pengamatanAwalPadat exists, create the new pengamatan record
        if (pengamatanAwalPadat && pengamatanAwalPadat.length > 0) {
          for (const pengamatan of pengamatanAwalPadat) {
            // Convert each Sequelize instance to a plain object to modify it
            const pengamatanData = pengamatan.toJSON();

            // Delete the 'id' and 'CatatanTrialID' fields
            delete pengamatanData.id;
            delete pengamatanData.CatatanTrialID;

            // Create a new record with the modified data and the new CatatanTrialID
            await t_pengamatanAwalPadat.create({
              ...pengamatanData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (pengamatanLanjutan) {
          const pengamatanLanjutanData = pengamatanLanjutan.toJSON();

          // Delete the 'id' and 'statusDokumen' fields
          delete pengamatanLanjutanData.id;
          delete pengamatanLanjutanData.CatatanTrialID;

          // Create a new record with the modified data and capture the new record
          const newPengamatanLanjutanData = await t_pengamatanLanjutan.create({
            ...pengamatanLanjutanData,
            CatatanTrialID: newCatatanTrial.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (pengamatanAwalCair && pengamatanAwalCair.length > 0) {
          for (const pengamatan of pengamatanAwalCair) {
            const pengamatanData = pengamatan.toJSON();
            delete pengamatanData.id;
            delete pengamatanData.CatatanTrialID;

            await t_pengamatanAwalCair.create({
              ...pengamatanData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // If pengamatanAwalSteril exists, create the new pengamatan record
        if (pengamatanAwalSteril && pengamatanAwalSteril.length > 0) {
          for (const pengamatan of pengamatanAwalSteril) {
            const pengamatanData = pengamatan.toJSON();
            delete pengamatanData.id;
            delete pengamatanData.CatatanTrialID;

            await t_pengamatanAwalSteril.create({
              ...pengamatanData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        // If pengamatanAwalPenyalutan exists, create the new pengamatan record
        if (pengamatanAwalPenyalutan && pengamatanAwalPenyalutan.length > 0) {
          for (const pengamatan of pengamatanAwalPenyalutan) {
            const pengamatanData = pengamatan.toJSON();
            delete pengamatanData.id;
            delete pengamatanData.CatatanTrialID;

            await t_pengamatanAwalPenyalutan.create({
              ...pengamatanData,
              CatatanTrialID: newCatatanTrial.id, // Set the new CatatanTrialID
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      res.status(201).json({ message: "Data has been duplicate" });
    } catch (error) {
      console.error("Error duplicating data", error);
    }
  }

  static async approvePemohon(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, inisial_user, bagian_user } =
        req.user;

      const {
        is_approve_1,
        approver_tanggal_1,
        keterangan_reject_1,
        // is_approve_2,
        // keterangan_reject_2,
      } = req.body;
      const { id } = req.params;
      const findStudiPemohon = await t_catatanTrial.findByPk(+id);
      if (!findStudiPemohon)
        throw new MyError(404, "Form studi tidak ditemukan");

      if (bagian_user === "RD1") {
        await t_catatanTrial.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
            statusDokumen: "Menunggu Approve Manager/Ast.Manager",
          },
          {
            where: {
              id,
            },
          }
        );
      } else if (bagian_user === "RD2") {
        await t_catatanTrial.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
            statusDokumen: "Menunggu Approve Manager/Ast.Manager",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }

  static async findAllNamaProduct01(req, res) {
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
          `SELECT 
    p.product_id,
    p.Product_Name, 
    p.Product_Kemasan
FROM 
    m_PRODUCT p
WHERE 
    p.isActive = 1 
GROUP BY 
    p.product_id, 
    p.Product_Name, 
    p.Product_Kemasan
ORDER BY 
    p.product_id ASC;
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
  static async findAllNamaProduct02(req, res) {
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
          `SELECT Product_ID, Product_Name, Product_Category FROM m_product WHERE Product_Category = '02' AND isActive = '1';
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
  static async findAllNamaProduct02FormulaFix(req, res) {
    try {
      const kodeTrialObatJadi = await m_kodeTrialObatJadi.findAll();

      res.status(200).json(kodeTrialObatJadi);
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch data",
        error: err.message,
      });
    }
  }

  static async createCatatanTrial(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, bagian_user } = req.user;

      const {
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
        filter,
        tipeCatatanTrial,
        upload,
      } = req.body;

      const createCatatanTrial = await t_catatanTrial.create({
        tanggalTrial: tanggalTrial || "",
        namaProduk: namaProduk || "",
        kodeTrial: kodeTrial || "",
        trialKe: trialKe || "",
        bentukSediaan: bentukSediaan || "",
        productKompetitor: productKompetitor || "",
        statusB: statusB || "",
        statusA: statusA || "",
        filter: filter || "",
        tipeCatatanTrial: tipeCatatanTrial || "",
        pic: nama_user || "",
        bagian: bagian_user || "",
        upload: upload || [],
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create CatatanTrial",
        data: createCatatanTrial,
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updateCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const {
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
        filter,
        tipeCatatanTrial,
        upload,
      } = req.body;

      let newUpload = upload?.filter((item) => item.trim() !== "");

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const [updatedRowsCount] = await t_catatanTrial.update(
        {
          tanggalTrial: tanggalTrial || "",
          namaProduk: namaProduk || "",
          kodeTrial: kodeTrial || "",
          trialKe: trialKe || "",
          bentukSediaan: bentukSediaan || "",
          productKompetitor: productKompetitor || "",
          statusB: statusB || "",
          statusA: statusA || "",
          filter: filter || "",
          tipeCatatanTrial: tipeCatatanTrial || "",
          upload: newUpload,
        },
        {
          where: { id: id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
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
          SELECT ItemID,ItemName,batchno,principle FROM t_NP_Sample_Stock WHERE ItemID != '' AND ItemID != '-'
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

  static async handleSaveKomposisiCatatanTrial(req, res) {
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
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevKomposisi = await t_komposisiCatatanTrial.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_komposisiCatatanTrial.create(
              {
                kode: newItem?.kode || "",
                namaBahanBaku: newItem?.namaBahanBaku || "",
                principle: newItem?.principle || "",
                jumlahTiapSediaan: newItem?.jumlahTiapSediaan || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_komposisiCatatanTrial.update(
              {
                kode: newItem?.kode || "",
                namaBahanBaku: newItem?.namaBahanBaku || "",
                principle: newItem?.principle || "",
                jumlahTiapSediaan: newItem?.jumlahTiapSediaan || "",
                CatatanTrialID: +id || null,
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
        await t_komposisiCatatanTrial.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_komposisiCatatanTrial.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_komposisiCatatanTrial.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePerhitunganZatAktif(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevPerhitunganZatAktif = await t_perhitunganZatAktif.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevPerhitunganZatAktif.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_perhitunganZatAktif.create(
              {
                padaEtiket: newItem?.padaEtiket || "",
                bahanBakuYangDigunakan: newItem?.bahanBakuYangDigunakan || "",
                perhitunganBahanBaku: newItem?.perhitunganBahanBaku || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_perhitunganZatAktif.update(
              {
                padaEtiket: newItem?.padaEtiket || "",
                bahanBakuYangDigunakan: newItem?.bahanBakuYangDigunakan || "",
                perhitunganBahanBaku: newItem?.perhitunganBahanBaku || "",
                CatatanTrialID: +id || null,
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
        await t_perhitunganZatAktif.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_perhitunganZatAktif.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_perhitunganZatAktif.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSaveMetodePembuatan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevMetodePembuatan = await t_metodePembuatan.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevMetodePembuatan.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_metodePembuatan.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                aktivitas: newItem?.aktivitas || "",
                pengamatan: newItem?.pengamatan || "",
                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_metodePembuatan.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                aktivitas: newItem?.aktivitas || "",
                pengamatan: newItem?.pengamatan || "",
                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
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
        await t_metodePembuatan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_metodePembuatan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_metodePembuatan.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);

      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveEvaluasiBulk(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevEvaluasiBulk = await t_evaluasiBulk.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevEvaluasiBulk.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_evaluasiBulk.create(
              {
                noFormula: newItem?.noFormula || "",
                bulkDensity: newItem?.bulkDensity || "",
                tappedDensity: newItem?.tappedDensity || "",
                carrIndex: newItem?.carrIndex || "",
                interpretasiHasil: newItem?.interpretasiHasil || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_evaluasiBulk.update(
              {
                noFormula: newItem?.noFormula || "",
                bulkDensity: newItem?.bulkDensity || "",
                tappedDensity: newItem?.tappedDensity || "",
                carrIndex: newItem?.carrIndex || "",
                interpretasiHasil: newItem?.interpretasiHasil || "",
                CatatanTrialID: +id || null,
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
        await t_evaluasiBulk.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_evaluasiBulk.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_evaluasiBulk.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<< er");

      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveProsesCatatanTrialPadat(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const flag_update = "UPDATE FOR DELETE";
      const { id } = req.params;

      console.log(data, "< DAT");

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevProses = await t_prosesCatatanTrialPadat.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevProses.map((item) => item?.id);
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
            console.log(
              {
                jam: newItem?.jam || "",
                gelatinTank: newItem?.gelatinTank || "",
                gelatinBox: newItem?.gelatinBox || "",
                hopper: newItem?.hopper || "",
                needle: newItem?.needle || "",
                pumpHeating: newItem?.pumpHeating || "",
                setDensity: newItem?.setDensity || "",
                jogSpeed: newItem?.jogSpeed || "",
              },
              "<<< asdasdas"
            );

            const created = await t_prosesCatatanTrialPadat.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                speed: newItem?.speed || "",
                mainPressure: newItem?.mainPressure || "",
                prePressure: newItem?.prePressure || "",
                settingBobot: newItem?.settingBobot || "",
                kekerasan: newItem?.kekerasan || "",
                tebal: newItem?.tebal || "",
                abrasi: newItem?.abrasi || "",
                wh: newItem?.wh || "",
                keterangan: newItem?.keterangan || "",
                jam: newItem?.jam || "",
                gelatinTank: newItem?.gelatinTank || "",
                gelatinBox: newItem?.gelatinBox || "",
                hopper: newItem?.hopper || "",
                needle: newItem?.needle || "",
                pumpHeating: newItem?.pumpHeating || "",
                setDensity: newItem?.setDensity || "",
                jogSpeed: newItem?.jogSpeed || "",

                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_prosesCatatanTrialPadat.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                speed: newItem?.speed || "",
                mainPressure: newItem?.mainPressure || "",
                prePressure: newItem?.prePressure || "",
                settingBobot: newItem?.settingBobot || "",
                kekerasan: newItem?.kekerasan || "",
                tebal: newItem?.tebal || "",
                abrasi: newItem?.abrasi || "",
                wh: newItem?.wh || "",
                keterangan: newItem?.keterangan || "",
                jam: newItem?.jam || "",
                gelatinTank: newItem?.gelatinTank || "",
                gelatinBox: newItem?.gelatinBox || "",
                hopper: newItem?.hopper || "",
                needle: newItem?.needle || "",
                pumpHeating: newItem?.pumpHeating || "",
                setDensity: newItem?.setDensity || "",
                jogSpeed: newItem?.jogSpeed || "",
                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
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
        await t_prosesCatatanTrialPadat.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_prosesCatatanTrialPadat.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_prosesCatatanTrialPadat.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);

      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveProsesCatatanTrialPenyalutan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevProsesCatatanTrialPenyalutan =
        await t_prosesCatatanTrialPenyalutan.findAll({
          where: {
            CatatanTrialID: id,
          },
          order: [["id", "ASC"]],
        });

      const existing = prevProsesCatatanTrialPenyalutan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_prosesCatatanTrialPenyalutan.create(
              {
                tanggal: newItem?.tanggal || "",
                jam: newItem?.jam || "",
                turretSpeed: newItem?.turretSpeed || "",
                suhu: newItem?.suhu || "",
                bobot: newItem?.bobot || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_prosesCatatanTrialPenyalutan.update(
              {
                tanggal: newItem?.tanggal || "",
                jam: newItem?.jam || "",
                turretSpeed: newItem?.turretSpeed || "",
                suhu: newItem?.suhu || "",
                bobot: newItem?.bobot || "",
                CatatanTrialID: +id || null,
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
        await t_prosesCatatanTrialPenyalutan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_prosesCatatanTrialPenyalutan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_prosesCatatanTrialPenyalutan.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalCair(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevKomposisi = await t_pengamatanAwalCair.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalCair.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalCair: newItem?.pengamatanAwalCair || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalCair.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalCair: newItem?.pengamatanAwalCair || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalCair.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalCair.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalCair.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalSteril(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevKomposisi = await t_pengamatanAwalSteril.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalSteril.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalSteril: newItem?.pengamatanAwalSteril || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalSteril.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalSteril: newItem?.pengamatanAwalSteril || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalSteril.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalSteril.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalSteril.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalPadat(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      console.log(data, "<< dat");

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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevKomposisi = await t_pengamatanAwalPadat.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(
            newItem?.spesifikasiKeseragamanBobotKapsulKosong,
            "<< TESSSSSS"
          );

          console.log(!newItem.id, "< IIIIIIDDD");

          if (!newItem?.id) {
            const created = await t_pengamatanAwalPadat.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                spesifikasiKekerasanTablet:
                  newItem?.spesifikasiKekerasanTablet || "",
                settingKekerasanTablet: newItem?.settingKekerasanTablet || "",
                evaluasiKekerasanTablet: newItem?.evaluasiKekerasanTablet || [],
                rataRataKekerasanTablet: newItem?.rataRataKekerasanTablet || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                spesifikasiKerapuhan: newItem?.spesifikasiKerapuhan || "",
                settingKerapuhan: newItem?.settingKerapuhan || "",
                evaluasiKerapuhan: newItem?.evaluasiKerapuhan || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiUkuran: newItem?.spesifikasiUkuran || "",
                settingUkuran: newItem?.settingUkuran || "",
                evaluasiUkuran: newItem?.evaluasiUkuran || "",

                spesifikasiKeseragamanBobotKapsulKosong:
                  newItem?.spesifikasiKeseragamanBobotKapsulKosong || "",
                spesifikasiKeseragamanBobotIsiKapsul:
                  newItem?.spesifikasiKeseragamanBobotIsiKapsul || "",
                spesifikasiBobotIsiCangkang:
                  newItem?.spesifikasiBobotIsiCangkang || "",
                spesifikasiBobotIsiCangkangBending:
                  newItem?.spesifikasiBobotIsiCangkangBending || "",
                spesifikasiWaktuHancurKapsul:
                  newItem?.spesifikasiWaktuHancurKapsul || "",
                settingWaktuHancurKapsul:
                  newItem?.settingWaktuHancurKapsul || "",
                evaluasiWaktuHancurKapsul:
                  newItem?.evaluasiWaktuHancurKapsul || "",
                spesifikasiPemerianIsiKapsul:
                  newItem?.spesifikasiPemerianIsiKapsul || "",
                settingPemerianIsiKapsul:
                  newItem?.settingPemerianIsiKapsul || "",
                evaluasiPemerianIsiKapsul:
                  newItem?.evaluasiPemerianIsiKapsul || "",
                spesifikasiCangkangKapsulNo:
                  newItem?.spesifikasiCangkangKapsulNo || "",
                settingCangkangKapsulNo: newItem?.settingCangkangKapsulNo || "",
                evaluasiCangkangKapsulNo:
                  newItem?.evaluasiCangkangKapsulNo || "",
                spesifikasiCap: newItem?.spesifikasiCap || "",
                settingCap: newItem?.settingCap || "",
                evaluasiCap: newItem?.evaluasiCap || "",
                spesifikasiBody: newItem?.spesifikasiBody || "",
                settingBody: newItem?.settingBody || "",
                evaluasiBody: newItem?.evaluasiBody || "",
                spesifikasiPenandaanCap: newItem?.spesifikasiPenandaanCap || "",
                settingPenandaanCap: newItem?.settingPenandaanCap || "",
                evaluasiPenandaanCap: newItem?.evaluasiPenandaanCap || "",
                spesifikasiPenandaanBody:
                  newItem?.spesifikasiPenandaanBody || "",
                settingPenandaanBody: newItem?.settingPenandaanBody || "",
                evaluasiPenandaanBody: newItem?.evaluasiPenandaanBody || "",

                syaratWarna: newItem?.syaratWarna || "",
                hasilWarna: newItem?.hasilWarna || "",
                syaratBauAroma: newItem?.syaratBauAroma || "",
                hasilBauAroma: newItem?.hasilBauAroma || "",
                syaratRasa: newItem?.syaratRasa || "",
                hasilRasa: newItem?.hasilRasa || "",
                syaratPh: newItem?.syaratPh || "",
                hasilPh: newItem?.hasilPh || "",
                syaratBj: newItem?.syaratBj || "",
                hasilBj: newItem?.hasilBj || "",
                syaratViskositas: newItem?.syaratViskositas || "",
                hasilViskositas: newItem?.hasilViskositas || "",

                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalPadat.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                spesifikasiKekerasanTablet:
                  newItem?.spesifikasiKekerasanTablet || "",
                settingKekerasanTablet: newItem?.settingKekerasanTablet || "",
                evaluasiKekerasanTablet: newItem?.evaluasiKekerasanTablet || [],
                rataRataKekerasanTablet: newItem?.rataRataKekerasanTablet || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                spesifikasiKerapuhan: newItem?.spesifikasiKerapuhan || "",
                settingKerapuhan: newItem?.settingKerapuhan || "",
                evaluasiKerapuhan: newItem?.evaluasiKerapuhan || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiUkuran: newItem?.spesifikasiUkuran || "",
                settingUkuran: newItem?.settingUkuran || "",
                evaluasiUkuran: newItem?.evaluasiUkuran || "",

                spesifikasiKeseragamanBobotKapsulKosong:
                  newItem?.spesifikasiKeseragamanBobotKapsulKosong || "",
                spesifikasiKeseragamanBobotIsiKapsul:
                  newItem?.spesifikasiKeseragamanBobotIsiKapsul || "",
                spesifikasiBobotIsiCangkang:
                  newItem?.spesifikasiBobotIsiCangkang || "",
                spesifikasiBobotIsiCangkangBending:
                  newItem?.spesifikasiBobotIsiCangkangBending || "",
                spesifikasiWaktuHancurKapsul:
                  newItem?.spesifikasiWaktuHancurKapsul || "",
                settingWaktuHancurKapsul:
                  newItem?.settingWaktuHancurKapsul || "",
                evaluasiWaktuHancurKapsul:
                  newItem?.evaluasiWaktuHancurKapsul || "",
                spesifikasiPemerianIsiKapsul:
                  newItem?.spesifikasiPemerianIsiKapsul || "",
                settingPemerianIsiKapsul:
                  newItem?.settingPemerianIsiKapsul || "",
                evaluasiPemerianIsiKapsul:
                  newItem?.evaluasiPemerianIsiKapsul || "",
                spesifikasiCangkangKapsulNo:
                  newItem?.spesifikasiCangkangKapsulNo || "",
                settingCangkangKapsulNo: newItem?.settingCangkangKapsulNo || "",
                evaluasiCangkangKapsulNo:
                  newItem?.evaluasiCangkangKapsulNo || "",
                spesifikasiCap: newItem?.spesifikasiCap || "",
                settingCap: newItem?.settingCap || "",
                evaluasiCap: newItem?.evaluasiCap || "",
                spesifikasiBody: newItem?.spesifikasiBody || "",
                settingBody: newItem?.settingBody || "",
                evaluasiBody: newItem?.evaluasiBody || "",
                spesifikasiPenandaanCap: newItem?.spesifikasiPenandaanCap || "",
                settingPenandaanCap: newItem?.settingPenandaanCap || "",
                evaluasiPenandaanCap: newItem?.evaluasiPenandaanCap || "",
                spesifikasiPenandaanBody:
                  newItem?.spesifikasiPenandaanBody || "",
                settingPenandaanBody: newItem?.settingPenandaanBody || "",
                evaluasiPenandaanBody: newItem?.evaluasiPenandaanBody || "",

                syaratWarna: newItem?.syaratWarna || "",
                hasilWarna: newItem?.hasilWarna || "",
                syaratBauAroma: newItem?.syaratBauAroma || "",
                hasilBauAroma: newItem?.hasilBauAroma || "",
                syaratRasa: newItem?.syaratRasa || "",
                hasilRasa: newItem?.hasilRasa || "",
                syaratPh: newItem?.syaratPh || "",
                hasilPh: newItem?.hasilPh || "",
                syaratBj: newItem?.syaratBj || "",
                hasilBj: newItem?.hasilBj || "",
                syaratViskositas: newItem?.syaratViskositas || "",
                hasilViskositas: newItem?.hasilViskositas || "",

                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalPadat.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalPadat.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalPadat.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<");

      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSavePengamatanAwalPenyalutan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevKomposisi = await t_pengamatanAwalPenyalutan.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalPenyalutan.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiWeightGain: newItem?.spesifikasiWeightGain || "",
                settingWeightGain: newItem?.settingWeightGain || "",
                evaluasiWeightGain: newItem?.evaluasiWeightGain || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                settingKeseragamanBobot: newItem?.rataRataKekerasanTablet || "",
                evaluasiKeseragamanBobot:
                  newItem?.evaluasiKeseragamanBobot || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiDimensi: newItem?.spesifikasiDimensi || "",
                settingDimensi: newItem?.settingDimensi || "",
                evaluasiDimensi: newItem?.evaluasiDimensi || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalPenyalutan.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiWeightGain: newItem?.spesifikasiWeightGain || "",
                settingWeightGain: newItem?.settingWeightGain || "",
                evaluasiWeightGain: newItem?.evaluasiWeightGain || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                settingKeseragamanBobot: newItem?.rataRataKekerasanTablet || "",
                evaluasiKeseragamanBobot:
                  newItem?.evaluasiKeseragamanBobot || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiDimensi: newItem?.spesifikasiDimensi || "",
                settingDimensi: newItem?.settingDimensi || "",
                evaluasiDimensi: newItem?.evaluasiDimensi || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalPenyalutan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalPenyalutan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalPenyalutan.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  static async handleSaveFormulaCatatanTrial(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;

      console.log(data, "<< DATA");

      const flag_update = "UPDATE FOR DELETE";
      const { id } = req.params;

      console.log(id, "<< id");

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const prevFormula = await t_formulaCatatanTrial.findAll({
        where: {
          CatatanTrialID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevFormula.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          console.log(newItem, "< new item");

          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_formulaCatatanTrial.create(
              {
                tujuanTrial: newItem?.tujuanTrial || "",
                tiapSediaan: newItem?.tiapSediaan || "",
                satuan: newItem?.satuan || "",
                besarBets: newItem?.besarBets || null,
                overmaat: newItem?.overmaat || null,
                kodeTrials: newItem?.kodeTrials || null,
                detailFormula: newItem?.detailFormula || null,
                notes: newItem?.notes || null,
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaCatatanTrial.update(
              {
                tujuanTrial: newItem?.tujuanTrial || "",
                tiapSediaan: newItem?.tiapSediaan || "",
                satuan: newItem?.satuan || "",
                besarBets: newItem?.besarBets || null,
                overmaat: newItem?.overmaat || null,
                kodeTrials: newItem?.kodeTrials || null,
                detailFormula: newItem?.detailFormula || null,
                notes: newItem?.notes || null,
                CatatanTrialID: +id || null,
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
        await t_formulaCatatanTrial.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaCatatanTrial.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaCatatanTrial.findAll({
        where: {
          CatatanTrialID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);

      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  // // handle post dan edit formula catatan trial
  // static async createFormulaCatatanTrial(req, res, next) {
  //   try {
  //     const {
  //       tujuanTrial,
  //       tiapSediaan,
  //       besarBets,
  //       overmaat,
  //       satuan,
  //       bentukSediaan,
  //       kodeTrials,
  //       detailFormula,
  //       CatatanTrialID,
  //     } = req.body;

  //     console.log(req.body, "<< body");

  //     const { user_id, delegated_to } = req.user;

  //     const createFormula = await t_formulaCatatanTrial.create({
  //       tujuanTrial: tujuanTrial,
  //       tiapSediaan: tiapSediaan,
  //       besarBets: besarBets,
  //       overmaat: overmaat,
  //       satuan: satuan,
  //       bentukSediaan: bentukSediaan,
  //       kodeTrials: kodeTrials,
  //       detailFormula: detailFormula,
  //       CatatanTrialID: +CatatanTrialID,
  //       user_id,
  //       delegated_to,
  //     });

  //     res.status(201).json({
  //       message: "Success Create Formula Catatan Trial",
  //       data: createFormula,
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     next(err);
  //   }
  // }
  // static async updateFormulaCatatanTrial(req, res, next) {
  //   try {
  //     const { id } = req.params; // Ambil id catatan trial dari URL

  //     const {
  //       tujuanTrial,
  //       tiapSediaan,
  //       besarBets,
  //       overmaat,
  //       satuan,
  //       bentukSediaan,
  //       kodeTrials,
  //       detailFormula,
  //     } = req.body;

  //     const cat = await t_catatanTrial.findByPk(+id);
  //     if (cat?.statusDokumen === "Reject") {
  //       await t_catatanTrial_status.destroy({
  //         where: { CatatanTrialID: +id },
  //       });
  //       await t_catatanTrial.update(
  //         {
  //           is_approve_1: "",
  //           approver_name_1: "",
  //           approver_user_id_1: "",
  //           approver_delegated_to_1: "",
  //           approver_tanggal_1: null,
  //           keterangan_reject_1: "",
  //           statusDokumen: "Draft",
  //         },
  //         {
  //           where: {
  //             id,
  //           },
  //         }
  //       );
  //     }

  //     const [updatedRowsCount] = await t_formulaCatatanTrial.update(
  //       {
  //         tujuanTrial: tujuanTrial || "",
  //         tiapSediaan: tiapSediaan || "",
  //         besarBets: +besarBets || null,
  //         overmaat: +overmaat || null,
  //         satuan: satuan || "",
  //         bentukSediaan: bentukSediaan || "",
  //         kodeTrials: kodeTrials || "",
  //         detailFormula: detailFormula || null,
  //       },
  //       {
  //         where: { id: +id },
  //       }
  //     );

  //     if (updatedRowsCount > 0) {
  //       res.status(201).json({
  //         message: "formula Catatan Trial updated successfully",
  //       });
  //     } else {
  //       res.status(404).json({
  //         message: "formula Catatan Trial not found",
  //       });
  //     }
  //   } catch (err) {
  //     console.log(err, "<<<< ERROR");
  //     next(err);
  //   }
  // }

  // handle post dan edit pengamatan awal cair
  static async createPengamatanAwalCair(req, res, next) {
    try {
      const { pengamatanAwalCair, CatatanTrialID } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalCair = await t_pengamatanAwalCair.create({
        pengamatanAwalCair: pengamatanAwalCair,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create proses Catatna trial padat",
        data: createPengamatanAwalCair,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalCair(req, res, next) {
    try {
      const { id } = req.params;

      const pengamatanAwalCairData = req.body.data; // Access req.body.data
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const updatedPengamatanCair = await t_pengamatanAwalCair.update(
        {
          pengamatanAwalCair: pengamatanAwalCairData || null,
        },
        {
          where: { id: +id },
        }
      );

      res.status(201).json({
        message: "pengamatan awal cair Catatan Trial updated successfully",
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  // handle post dan edit pengamatan awal steril

  static async createPengamatanAwalSteril(req, res, next) {
    try {
      const { pengamatanAwalSteril, CatatanTrialID } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalSteril = await t_pengamatanAwalSteril.create({
        pengamatanAwalSteril: pengamatanAwalSteril,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create proses Catatna trial steril",
        data: createPengamatanAwalSteril,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalSteril(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const pengamatanAwalSterilData = req.body.data; // Access req.body.data

      const updatedPengamatanSteril = t_pengamatanAwalSteril.update(
        {
          pengamatanAwalSteril: pengamatanAwalSterilData || null,
        },
        {
          where: { id: +id },
        }
      );

      res.status(201).json({
        message: "pengamatan awal steril Catatan Trial updated successfully",
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  // handle post dan edit pengamatan awal padat
  static async createPengamatanAwalPadat(req, res, next) {
    try {
      const {
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
        CatatanTrialID,
      } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalPadat = await t_pengamatanAwalPadat.create({
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet: evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan: evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create pengamatan awal padat",
        data: createPengamatanAwalPadat,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalPadat(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const {
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
      } = req.body;

      const [updatedRowsCount] = await t_pengamatanAwalPadat.update(
        {
          spesifikasiPemerian: spesifikasiPemerian || "",
          settingPemerian: settingPemerian || "",
          evaluasiPemerian: evaluasiPemerian || "",
          spesifikasiKeseragamanBobot: spesifikasiKeseragamanBobot || "",
          spesifikasiKekerasanTablet: spesifikasiKekerasanTablet || "",
          settingKekerasanTablet: settingKekerasanTablet || "",
          evaluasiKekerasanTablet: evaluasiKekerasanTablet || [],
          rataRataKekerasanTablet: rataRataKekerasanTablet || "",
          spesifikasiKerapuhan: spesifikasiKerapuhan || "",
          settingKerapuhan: settingKerapuhan || "",
          evaluasiKerapuhan: evaluasiKerapuhan || "",
          spesifikasiKetebalan: spesifikasiKetebalan || "",
          settingKetebalan: settingKetebalan || "",
          evaluasiKetebalan: evaluasiKetebalan || [],
          rataRataKetebalan: rataRataKetebalan || "",
          spesifikasiUkuran: spesifikasiUkuran || "",
          settingUkuran: settingUkuran || "",
          evaluasiUkuran: evaluasiUkuran || "",
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal padat updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal padat not found",
        });
      }
    } catch (err) {
      console.log(err, "<<<< ERROR");
      next(err);
    }
  }

  // handle post dan edit distribusi ukuran partikel
  static async createDistribusiUkuranPartikel(req, res, next) {
    try {
      const { headers, content, CatatanTrialID } = req.body;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const createDistribusi = await t_distribusiUkuranPartikel.create({
        headers,
        content,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create Distribusi Ukuran Partikel",
        data: createDistribusi,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updateDistribusiUkuranPartikel(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const { headers, content } = req.body;

      const [updatedRowsCount] = await t_distribusiUkuranPartikel.update(
        {
          headers: headers || "",
          content: content || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message:
            "distribusi ukuran partikel Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "distribusi ukuran partikel Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  // handle post dan edit pengamatan lanjutan
  static async createPengamatanLanjutan(req, res, next) {
    try {
      const { kodeTrialHeaders, content, CatatanTrialID } = req.body;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const createPengamatanLanjutan = await t_pengamatanLanjutan.create({
        kodeTrialHeaders,
        content,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create pengamatanLAnjutan",
        data: createPengamatanLanjutan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalLanjutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const { kodeTrialHeaders, content } = req.body;

      const [updatedRowsCount] = await t_pengamatanLanjutan.update(
        {
          kodeTrialHeaders: kodeTrialHeaders || "",
          content: content || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan lanjutan Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan lanjutan Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async deletePengamatanAwalLanjutan(req, res, next) {
    try {
      const { id } = req.params; // Getting CatatanTrialID from req.params

      console.log(req.params, "< PARAMS");

      // Find the record by CatatanTrialID
      const pengamatanLanjutan = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: +id },
      });

      console.log(pengamatanLanjutan, "< aa");

      if (!pengamatanLanjutan) {
        return res.status(404).json({
          message: "Pengamatan Lanjutan not found",
        });
      }

      // Delete the record
      await t_pengamatanLanjutan.destroy({ where: { CatatanTrialID: +id } });

      res.status(200).json({
        message: "Success Delete pengamatanLanjutan",
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // handle post dan edit pengamatan awal penyalutan
  static async createPengamatanAwalPenyalutan(req, res, next) {
    try {
      const {
        spesifikasiWeightGain,
        settingWeightGain,
        evaluasiWeightGain,
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        settingKeseragamanBobot,
        evaluasiKeseragamanBobot,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiDimensi,
        settingDimensi,
        evaluasiDimensi,
        spesifikasiWaktuHancur,
        settingWaktuHancur,
        evaluasiWaktuHancur,
        CatatanTrialID,
      } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalPenyalutan =
        await t_pengamatanAwalPenyalutan.create({
          spesifikasiWeightGain,
          settingWeightGain,
          evaluasiWeightGain,
          spesifikasiPemerian,
          settingPemerian,
          evaluasiPemerian,
          spesifikasiKeseragamanBobot,
          settingKeseragamanBobot,
          evaluasiKeseragamanBobot,
          spesifikasiKetebalan,
          settingKetebalan,
          evaluasiKetebalan,
          rataRataKetebalan,
          spesifikasiDimensi,
          settingDimensi,
          evaluasiDimensi,
          spesifikasiWaktuHancur,
          settingWaktuHancur,
          evaluasiWaktuHancur,
          CatatanTrialID,
          user_id,
          delegated_to,
        });

      res.status(201).json({
        message: "Success Create pengamatan awal penyalutan",
        data: createPengamatanAwalPenyalutan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalPenyalutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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

      const {
        spesifikasiWeightGain,
        settingWeightGain,
        evaluasiWeightGain,
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        settingKeseragamanBobot,
        evaluasiKeseragamanBobot,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiDimensi,
        settingDimensi,
        evaluasiDimensi,
        spesifikasiWaktuHancur,
        settingWaktuHancur,
        evaluasiWaktuHancur,
      } = req.body;

      const [updatedRowsCount] = await t_pengamatanAwalPenyalutan.update(
        {
          spesifikasiWeightGain: spesifikasiWeightGain || "",
          settingWeightGain: settingWeightGain || "",
          evaluasiWeightGain: evaluasiWeightGain || "",
          spesifikasiPemerian: spesifikasiPemerian || "",
          settingPemerian: settingPemerian || "",
          evaluasiPemerian: evaluasiPemerian || "",
          spesifikasiKeseragamanBobot: spesifikasiKeseragamanBobot || "",
          settingKeseragamanBobot: settingKeseragamanBobot || "",
          evaluasiKeseragamanBobot: evaluasiKeseragamanBobot || "",
          spesifikasiKetebalan: spesifikasiKetebalan || "",
          settingKetebalan: settingKetebalan || "",
          evaluasiKetebalan: evaluasiKetebalan || [],
          rataRataKetebalan: rataRataKetebalan || "",
          spesifikasiDimensi: spesifikasiDimensi || "",
          settingDimensi: settingDimensi || "",
          evaluasiDimensi: evaluasiDimensi || "",
          spesifikasiWaktuHancur: spesifikasiWaktuHancur || "",
          settingWaktuHancur: settingWaktuHancur || "",
          evaluasiWaktuHancur: evaluasiWaktuHancur || "",
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal penyalutan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal penyalutan not found",
        });
      }
    } catch (err) {
      console.log(err, "<<<< ERROR");
      next(err);
    }
  }

  static async updatePerhitunganBatasBahanTambahan(req, res) {
    try {
      const { CatatanTrialID } = req.params;

      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
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

      const { perhitunganBatasBahanTambahan } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updatePerhitunganBatasBahanTambahan = await t_catatanTrial.update(
        { perhitunganBatasBahanTambahan: perhitunganBatasBahanTambahan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updatePerhitunganBatasBahanTambahan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updatePembahasan(req, res) {
    try {
      const { CatatanTrialID } = req.params;

      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
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
      const { pembahasan } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updatePembahasan = await t_catatanTrial.update(
        { pembahasan: pembahasan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updatePembahasan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateKesimpulan(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
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
      const { kesimpulan } = req.body;

      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateKesimpulan = await t_catatanTrial.update(
        { kesimpulan: kesimpulan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );

      res.status(200).json(updateKesimpulan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateTindakLanjut(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
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
      const { tindakLanjut } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateTindakLanjut = await t_catatanTrial.update(
        { tindakLanjut: tindakLanjut },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateTindakLanjut);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateUpload(req, res) {
    try {
      console.log("xixixixixi");

      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
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
      const upload = req.body;
      console.log(upload, "< 123");

      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      console.log(findCatatanTrialID.id, "< ID");

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateUpload = await t_catatanTrial.update(
        { upload }, // Directly using upload array
        {
          where: { id: findCatatanTrialID.id },
          returning: true,
        }
      );
      console.log(updateUpload, "<< update");

      res.status(200).json(updateUpload);
    } catch (err) {
      console.log(err);
    }
  }

  static async approveCatatanTrial(req, res, next) {
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
      const findCatatanTrial = await t_catatanTrial.findByPk(+id);
      if (!findCatatanTrial)
        throw new MyError(404, "Form CatatanTrial tidak ditemukan");
      const apprNo = await checkStatusCatatanTrial(id);

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "catatanTrial",
        findCatatanTrial.bagian,
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
        statusDokumen = getStatusCatatanTrial(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) statusDokumen = "Closed";
      if (is_approve === false) {
        statusDokumen = "Reject";
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
      }

      await t_catatanTrial_status.create({
        CatatanTrialID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_catatanTrial.update(
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

  // get komposisi nama nahan
  static async getKomposisiNamaBahan(req, res) {
    const { id } = req.params;
    try {
      const komposisi = await t_komposisiCatatanTrial.findAll({
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
  // get catatan trial padat saja
  static async getFilterCatatanTrialPadat(req, res) {
    try {
      const catatanTrialPadat = await t_catatanTrial.findAll({
        where: { tipeCatatanTrial: "catatan trial padat" },
        attributes: [
          "id",
          "tanggalTrial",
          "namaProduk",
          "kodeTrial",
          "trialKe",
          "bentukSediaan",
          "tipeCatatanTrial",
        ],
      });

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(catatanTrialPadat);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  //  get bentuk sediaan cair
  static async getBentukSediaanCategoryCair(req, res) {
    try {
      const bentukSediaanCair = await m_bentuk_sediaan.findAll({
        where: { category: "cair" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanCair.length === 0) {
        throw new Error("No 'cair' categories found");
      }

      res.status(200).json(bentukSediaanCair);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  //get bentuk sediaan padat
  static async getBentukSediaanCategoryPadat(req, res) {
    try {
      const bentukSediaanPadat = await m_bentuk_sediaan.findAll({
        where: { category: "padat" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanPadat.length === 0) {
        throw new Error("No 'Padat' categories found");
      }

      res.status(200).json(bentukSediaanPadat);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  // get bentuk sediaan steril
  static async getBentukSediaanCategorySteril(req, res) {
    try {
      const bentukSediaanSteril = await m_bentuk_sediaan.findAll({
        where: { category: "steril" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanSteril.length === 0) {
        throw new Error("No 'Steril' categories found");
      }

      res.status(200).json(bentukSediaanSteril);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  // list all catatan trial
  static async findAllCatatanTrial(req, res) {
    try {
      const {
        page,
        namaProduk,
        trialKe,
        tipeCatatanTrial,
        pic,
        bagian,
        statusDokumen,
        alasan,
      } = req.query;
      const size = page ? 20 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (trialKe) searchParams.trialKe = { [Op.iLike]: `%${trialKe}%` };
      if (tipeCatatanTrial)
        searchParams.tipeCatatanTrial = { [Op.iLike]: `%${tipeCatatanTrial}%` };
      if (namaProduk) if (pic) searchParams.pic = { [Op.iLike]: `%${pic}%` };

      if (bagian) searchParams.bagian = { [Op.iLike]: `%${bagian}%` };

      if (statusDokumen)
        searchParams.statusDokumen = {
          [Op.iLike]: `%${statusDokumen}%`,
        };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };

      const brief = await t_catatanTrial.findAndCountAll({
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

  static async getCatatanTrialDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      // const user = req.user;

      // const user_id = user?.user?.log_NIK;

      const { id } = req.params;

      let catatanTrialDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        catatanTrialDetails = await t_catatanTrial?.findOne({
          where: {
            id,
          },
          include: { model: t_catatanTrial_status, as: "approver_data" },
          order: [
            [
              { model: t_catatanTrial_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });

        catatanTrialDetails.dataValues.approver_inisial_1 =
          await fetchApproverInisial({
            user_id: catatanTrialDetails.dataValues.approver_user_id_1,
            delegated_to:
              catatanTrialDetails.dataValues.approver_delegated_to_1,
          });
        catatanTrialDetails.dataValues.approver_inisial_2 =
          await fetchApproverInisial({
            user_id: catatanTrialDetails.dataValues.approver_user_id_2,
            delegated_to:
              catatanTrialDetails.dataValues.approver_delegated_to_2,
          });
      } else {
        catatanTrialDetails = await t_catatanTrial.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_catatanTrial_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_catatanTrial_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      console.log(catatanTrialDetails, "< DETEL");

      catatanTrialDetails.dataValues.approver_inisial_1 =
        await fetchApproverInisial({
          user_id: catatanTrialDetails.dataValues.approver_user_id_1,
          delegated_to: catatanTrialDetails.dataValues.approver_delegated_to_1,
        });
      catatanTrialDetails.dataValues.approver_inisial_2 =
        await fetchApproverInisial({
          user_id: catatanTrialDetails.dataValues.approver_user_id_2,
          delegated_to: catatanTrialDetails.dataValues.approver_delegated_to_2,
        });
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = catatanTrialDetails.bagian;

      const apprNo = await checkStatusCatatanTrial(id);

      await Promise.all(
        catatanTrialDetails.dataValues.approver_data.map(async (el, index) => {
          el.dataValues.approver_inisial = await fetchApproverInisial({
            user_id: el.user_id,
            delegated_to: el.delegated_to,
          });

          return el;
        })
      );

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "catatanTrial",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );

      if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({ catatanTrialDetails, isApprove });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialCairDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailCair = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiCair = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const perhitunganZatAktifCair = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const formulaCair = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanCair = Object.values(metodePembuatanGrouped);

      const pengamatanAwalCair = await t_pengamatanAwalCair.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const pengamatanLanjutanCair = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        catatanTrialDetailCair,
        komposisiCair,
        perhitunganZatAktifCair,
        formulaCair,
        metodePembuatanCair,
        pengamatanAwalCair,
        pengamatanLanjutanCair,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async getCatatanTrialSterilDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailSteril = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiSteril = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const perhitunganZatAktifSteril = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const formulaSteril = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanSteril = Object.values(metodePembuatanGrouped);
      const pengamatanAwalSteril = await t_pengamatanAwalSteril.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const pengamatanLanjutanSteril = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);

      res.status(200).json({
        catatanTrialDetailSteril,
        komposisiSteril,
        perhitunganZatAktifSteril,
        formulaSteril,
        metodePembuatanSteril,
        pengamatanAwalSteril,
        pengamatanLanjutanSteril,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialPadatDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPadat = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiPadat = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const perhitunganZatAktifPadat = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const formulaPadat = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanPadat = Object.values(metodePembuatanGrouped);

      const proses = await t_prosesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const prosesGrouped = proses.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const prosesCatatanTrialPadat = Object.values(prosesGrouped);

      const pengamatanAwalPadat = await t_pengamatanAwalPadat.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const pengamatanLanjutanPadat = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const distribusiUkuranPartikel = await t_distribusiUkuranPartikel.findOne(
        {
          where: { CatatanTrialID: id },
          order: [["id", "ASC"]],
        }
      );
      const evaluasiBulk = await t_evaluasiBulk.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailPadat,
        komposisiPadat,
        perhitunganZatAktifPadat,
        formulaPadat,
        metodePembuatanPadat,
        prosesCatatanTrialPadat,
        pengamatanAwalPadat,
        pengamatanLanjutanPadat,
        evaluasiBulk,
        distribusiUkuranPartikel,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialPenyalutanDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPenyalutan = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });

      const formulaPenyalutan = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const prosesPenyalutan = await t_prosesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanPenyalutan = Object.values(metodePembuatanGrouped);
      const pengamatanAwalPenyalutan = await t_pengamatanAwalPenyalutan.findAll(
        {
          where: { CatatanTrialID: id },
          order: [["id", "ASC"]],
        }
      );

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailPenyalutan,
        formulaPenyalutan,
        metodePembuatanPenyalutan,
        prosesPenyalutan,
        pengamatanAwalPenyalutan,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  // get history
  static async getHistoryCatatanTrial(req, res, next) {
    try {
      const { id } = req.params;

      // find prosedur pengolahan table
      const catatanTrial = await t_catatanTrial.findByPk(+id);

      if (!catatanTrial) {
        res.status(404).json({ error: "Not Found" });
      } else {
        // find approval history table
        const approvalHistory = await t_catatanTrial_status.findAll({
          where: {
            CatatanTrialID: +id,
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
  // update perhitungan
  static async updatePerhitunganZatAktif(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
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
      const { padaEtiket, bahanBakuYangDigunakan, perhitunganBahanBaku } =
        req.body;

      const [updatedRowsCount] = await t_perhitunganZatAktif.update(
        {
          padaEtiket: padaEtiket || "",
          bahanBakuYangDigunakan: bahanBakuYangDigunakan || "",
          perhitunganBahanBaku: perhitunganBahanBaku || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "perhitungan zat aktif Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "perhitungan zat aktif Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  static async deleteCatatanTrial(req, res) {
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

      const findCatatanTrial = await t_catatanTrial.findByPk(+id);
      if (!findCatatanTrial)
        throw new MyError(404, "Form Catatan Trial tidak di temukan");

      // First, update all related records
      await t_catatanTrial_status.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_komposisiCatatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_perhitunganZatAktif.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_metodePembuatan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_prosesCatatanTrialPadat.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_prosesCatatanTrialPenyalutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_formulaCatatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalCair.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanLanjutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalPadat.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalSteril.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalPenyalutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_distribusiUkuranPartikel.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_evaluasiBulk.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );

      // Next, delete all related records
      await t_catatanTrial_status.destroy({ where: { CatatanTrialID: +id } });
      await t_evaluasiBulk.destroy({ where: { CatatanTrialID: +id } });
      await t_distribusiUkuranPartikel.destroy({
        where: { CatatanTrialID: +id },
      });
      await t_komposisiCatatanTrial.destroy({ where: { CatatanTrialID: +id } });
      await t_perhitunganZatAktif.destroy({ where: { CatatanTrialID: +id } });
      await t_metodePembuatan.destroy({ where: { CatatanTrialID: +id } });
      await t_prosesCatatanTrialPadat.destroy({
        where: { CatatanTrialID: +id },
      });
      await t_prosesCatatanTrialPenyalutan.destroy({
        where: { CatatanTrialID: +id },
      });
      await t_formulaCatatanTrial.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalCair.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanLanjutan.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalPadat.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalSteril.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalPenyalutan.destroy({
        where: { CatatanTrialID: +id },
      });

      // Finally, update and delete the main record
      await t_catatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { id: +id } }
      );
      await t_catatanTrial.destroy({ where: { id: +id } });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}
8;
module.exports = ControllerCatatanTrial;
