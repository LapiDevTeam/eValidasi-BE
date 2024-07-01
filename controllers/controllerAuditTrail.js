const ExcelJS = require("exceljs");
const {
  t_productBrief_hist,
  t_productBrief_status,
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
const { sequelize } = require("../models/index");
const { log } = require("console");
class ControllerAuditTrail {
  static async downloadExcelAuditProductBriefHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "productBrief" , kode , nama  , kemasan , "bentukSediaan" , "ruangLingkup" ,"bahanAktifDanDosis"  ,"rdSelection" , "statusDokumen" , alasan_reject ,revisi  , user_id ,delegated_to , flag_update ,"createdAt" , "updatedAt" , status  , "changeDate" FROM "t_productBrief_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="product-brief-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditProductBriefStatusHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "ProductBriefId" , approver_no , is_approve  , approver_name , "approver_inisial" , "keterangan_reject" ,"user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate"  FROM "t_productBrief_status_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="product-brief-status-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditCatatanTrialHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "tanggalTrial" , "namaProduk" , "trialKe"  , "bentukSediaan" , "productKompetitor" , "statusDokumen" ,"perhitunganBatasBahanTambahan"  ,"pembahasan" , "kesimpulan" ,"tindakLanjut",filter, "tipeCatatanTrial", pic,bagian,alasan_reject,user_id,delegated_to,flag_update,"createdAt" ,"updatedAt"  , status ,"changeDate"  FROM "t_catatanTrial_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="catatan-trial-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditCatatanTrialStatusHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "CatatanTrialID" , approver_no , is_approve  , approver_name ,approver_joblevel_id, "approver_inisial" , "keterangan_reject" ,"user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_catatanTrial_status_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="catatan-trial-status(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditKomposisiCatatanTrialHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "kode" , "namaBahanBaku" , principle  , "jumlahTiapSediaan" ,"CatatanTrialID" ,"user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_komposisiCatatanTrial_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="komposisi-catatan-trial-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPerhitunganZatAktifHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "padaEtiket" , "bahanBakuYangDigunakan" , "perhitunganBahanBaku"  ,"CatatanTrialID" ,"user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_perhitunganZatAktif_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="perhitungan-zat-aktif-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditFormulaCatatanTrialHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "tujuanTrial" , "tiapSediaan" , "besarBets"  ,"overmaat" ,satuan,"bentukSediaan","kodeTrials","detailFormula","CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_formulaCatatanTrial_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="formula-catatan-trial-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditMetodePembuatanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "aktivitas" , "pengamatan" ,"CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_metodePembuatan_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="metode-pembuatan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPengamatanAwalCairHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "pengamatanAwalCair"  ,"CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_pengamatanAwalCair_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pengamatan-awal-cair-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPengamatanAwalPadatHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "spesifikasiPemerian" ,"settingPemerian","evaluasiPemerian","spesifikasiKeseragamanBobot","spesifikasiKekerasanTablet","settingKekerasanTablet","evaluasiKekerasanTablet","rataRataKekerasanTablet","spesifikasiKerapuhan","settingKerapuhan", "evaluasiKerapuhan","spesifikasiKetebalan","settingKetebalan","evaluasiKetebalan","rataRataKetebalan","spesifikasiUkuran","settingUkuran","evaluasiUkuran","CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_pengamatanAwalPadat_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pengamatan-awal-padat-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPengamatanAwalSterilHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "pengamatanAwalSteril"  ,"CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_pengamatanAwalSteril_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pengamatan-awal-steril-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPengamatanAwalPenyalutanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id ,     "spesifikasiWeightGain",
        "settingWeightGain",
        "evaluasiWeightGain",
        "spesifikasiPemerian",
        "settingPemerian",
        "evaluasiPemerian",
        "spesifikasiKeseragamanBobot",
        "settingKeseragamanBobot",
        "evaluasiKeseragamanBobot",
        "spesifikasiKetebalan",
        "settingKetebalan",
        "evaluasiKetebalan",
        "rataRataKetebalan",
        "spesifikasiDimensi",
        "settingDimensi",
        "evaluasiDimensi",
        "spesifikasiWaktuHancur",
        "settingWaktuHancur",
        "evaluasiWaktuHancur",
        "CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_pengamatanAwalPenyalutan_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pengamatan-awal-penyalutan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditPengamatanAwalLanjutanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id ,"kodeTrialHeaders",content,
        "CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_pengamatanLanjutan_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pengamatan-awal-lanjutan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditProsesCatatanTrialPadatHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id ,"speed","mainPressure","prePressure","settingBobot",kekerasan,tebal,abrasi,wh,keterangan
        "CatatanTrialID","user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_prosesCatatanTrialPadat_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="proses-catatan-trial-padat-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ControllerAuditTrail;
