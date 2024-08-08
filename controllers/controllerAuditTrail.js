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
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");
const { sequelize } = require("../models/index");

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
        `SELECT id , "tanggalTrial" , "namaProduk" , "trialKe"  , "bentukSediaan" , "productKompetitor" , "statusDokumen" ,"perhitunganBatasBahanTambahan"  ,"pembahasan" , "kesimpulan" ,"tindakLanjut",filter, "tipeCatatanTrial", bagian,"alasan_reject","user_id","delegated_to","flag_update","createdAt" ,"updatedAt"  , status ,"changeDate"  FROM "t_catatanTrial_hist"`,
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
  static async downloadExcelAuditStudiPraformulasiHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT  nomor,
        "tanggalPenyusunan",
        "namaProduk",
        komposisi,
        kemasan,
        alasan,
        tujuan,
        revisi,
        "productBriefNo",
        "ProductBriefId",
        "statusDokumen",
        "rdSelection",
        "tujuanScreening",
        "kesimpulanScreening",
        kesimpulan,
        "is_approve_1",
        "approver_tanggal_1",
        "keterangan_reject_1",
        "is_approve_2",
        "keterangan_reject_2",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_studiPraformulasi_hist"`,
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
        `attachment; filename="studi-praformulasi-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditStudiPraformulasiStatusHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT  "StudiPraformulasiID" , approver_no , is_approve  , approver_name , "approver_inisial" , "keterangan_reject" ,"user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate"  from "t_studiPraformulasi_status_hist"`,
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
        `attachment; filename="studi-praformulasi-status-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditDeskripsiProductHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT     "namaStudi",
      "namaProduk",
      manufacturer,
      "bentukSediaan",
      dosage,
      "labelClaim",
      "rutePemberian",
      "aturanPakai",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_deskripsiProduct_hist"`,
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
        `attachment; filename="deskripsi-product-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditFarmakologiKlinisHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT      indikasi,
      "mekanismeAksi",
      "efekSamping",
      absorpsi,
      distribusi,
      metabolisme,
      eliminasi,
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_farmakologiKlinis_hist"`,
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
        `attachment; filename="farmakologi-klinis-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditFormulaHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT       "bahanTambahan",
      kandungan,
      fungsi,
      "prosesPembuatan",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_formula_hist"`,
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
        `attachment; filename="formula-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKemasanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
      "namaProduk",
      manufacturer,
      "noBatch",
      "tanggalProduksi",
      "tanggalKadarluarsa",
      "sumberPustaka",
      "bentukSediaan",
      "jenisKemasPrimer",
      "hasilUjiKemasPrimer",
      "jenisKemasSekunder",
      "hasilUjiKemasSekunder",
      "gambar",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_kemasan_hist"`,
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
        `attachment; filename="kemasan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.log(error);

      next(error);
    }
  }
  static async downloadExcelAuditStabilitaHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
       "namaProduk",
      "kondisiPenyimpanan",
      "kondisiKhusus",
      "hasilStudiStabilita",
      "masaKadaluarsa",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_stabilita_hist"`,
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
        `attachment; filename="stabilita-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKarakteristikFisikaKimiaHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
        "namaProduk",
      "manufacturer",
      "noBatch",
      het,
      "tanggalProduksi",
      "tanggalKadarluarsa",
      "bentukSediaan",
      "sumberPustaka",
      "detailSediaan",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_karakteristikFisikakimia_hist"`,
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
        `attachment; filename="karakteristik-fisikaKimia-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKarakteristikBahanAktifHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
           "namaBahan",
      "tableIndex",
      "parameter",
      "hasilTinjauan",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_karakteristikBahanAktif_hist"`,
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
        `attachment; filename="karakteristik-bahan-aktif-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKarakteristikBahanTambahanHist(
    req,
    res,
    next
  ) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
           "namaBahan",
      "tableIndex",
      "parameter",
      "hasilTinjauan",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_karakteristikBahanTambahan_hist"`,
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
        `attachment; filename="karakteristik-bahan-tambahan-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKarakteristikBahanKemasanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
           "namaBahan",
      "tableIndex",
      "parameter",
      "hasilTinjauan",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_karakteristikBahanKemasan_hist"`,
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
        `attachment; filename="karakteristik-bahan-kemasan-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditStudiPatenHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
              "nomorPaten",
      "judulPaten",
      "filingDate",
      "expiredDate",
      "claimPaten",
      "infringePaten",
      "sumberPustaka",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_studiPaten_hist"`,
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
        `attachment; filename="studi-paten-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditMatrixPerbandinganHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
            "spesifikasiHeaders",
        "content",
        "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_matrixPerbandingan_hist"`,
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
        `attachment; filename="matrix-perbandingan-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditUjiInkompatibilitasHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
            "namaBahan",
      kondisi1,
      kondisi2,
      kondisi3,
      "detailUji",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_ujiInkompatibilitas_hist"`,
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
        `attachment; filename="uji-inkompatibilitas-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditQtppHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
          "bentukSediaan",
      "targetBentukSediaan",
      "justifikasiBentukSediaan",
      "detailSediaan",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_qtpp_hist"`,
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
        `attachment; filename="qtpp-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditCqaHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
          "qttpElements",
      target,
      safety,
      efficacy,
      "formulaDanProses",
      "apakahIniKritikalCqa",
      justifikasi,
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_cqa_hist"`,
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
        `attachment; filename="cqa-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditFormulaProtokolHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
          komposisi,
          jumlah,
      fungsi,
      "apakahAdaPadaKomposisiOriginatorKompetitor",
      justifikasi,
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_formulaProtokol_hist"`,
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
        `attachment; filename="formula-protokol-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditProsesPembuatanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
        "prosesPembuatan",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_prosesPembuatan_hist"`,
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
        `attachment; filename="proses-pembuatan-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKemasanProtokolHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
         "parameterBentukSediaan",
      "samaDenganOriginatorAtauKompetitorBentukSediaan",
      "justifikasiBentukSediaan",
      "detailSediaan",
      "tableIndex",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_kemasanProtokolSkalaLab_hist"`,
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
        `attachment; filename="kemasan-protokol-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditZatAktifHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
       "materialAttributes",
      "pengaruhKeCqa",
      "apakahVariabelDapatDimodifikasi",
      "apakahTermasukCma",
      justifikasi,
      "tableIndex",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_zatAktif_hist"`,
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
        `attachment; filename="zat-aktif-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditBahanTambahanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
       "bahanTambahan",
                "pengaruhKeCqa",
                "apakahVariabelDapatDimodifikasi",
                "apakahTermasukCma",
                justifikasi,
                "tableIndex",
                "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_bahanTambahan_hist"`,
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
        `attachment; filename="bahan-tambahan-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKemasanPrimerHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
        "materialAttributes",
      "pengaruhKeCqa",
      "apakahVariabelDapatDimodifikasi",
      "apakahTermasukCma",
      justifikasi,
      "tableIndex",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_kemasanPrimer_hist"`,
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
        `attachment; filename="kemasan-primer-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditMappingProcessHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
     
      "processParameters",
      "materialAttributes",
      "manufacturingProcess",
      "qualityAttributes",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_mappingProcess_hist"`,
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
        `attachment; filename="mapping-process-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditCppHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
     
        "parameterProcess",
        "pengaruhKeCqa",
        "apakahTermasukCpp",
        justifikasi,
        "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_cpp_hist"`,
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
        `attachment; filename="cpp-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditRencanaAktivitasHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
           "tersediaBahanAwal",
        "optimasiFormulaDanProses",
        "stabilitaSkalaLab",
        "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_rencanaAktivitas_hist"`,
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
        `attachment; filename="rencana-aktivitas-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditMaterialHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
       "jumlahPenelitianAnalisaMaterial",
                "kebutuhanAnalisaMaterial",
                "biayaAnalisaMaterial",
                "jumlahPenelitianOrientasiFormulaDanProses",
                "kebutuhanOrientasiFormulaDanProses",
                "biayaOrientasiFormulaDanProses",
                "jumlahPenelitianOptimasiFormulaDanProses",
                "kebutuhanOptimasiFormulaDanProses",
                "biayaOptimasiFormulaDanProses",
                "jumlahPenelitianStabilitaSkalaLab",
                "kebutuhanStabilitaSkalaLab",
                "biayaStabilitaSkalaLab",
                "jumlahPenelitianSampelPerTinggal",
                "kebutuhanSampelPerTinggal",
                "biayaSampelPerTinggal",
                "totalKebutuhanMaterial",
                "perkiraanHargaPembelianMaterial",
                source,
                "tableIndex",
                "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_material_hist"`,
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
        `attachment; filename="material-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditOriginatorKompetitorHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
     originator,
      source,
      harga,
      "pemeriksaanFisikDanKimiaOriginator",
      "profilDisolusi",
      stabilita,
      "ujiBE",
      "cadangan",
      "totalKebutuhanMaterial",
      "perkiraanHargaPembelianMaterial",
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_originatorAtauKompetitor_hist"`,
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
        `attachment; filename="originator-kompetitor-(${currentDate}).xlsx"`
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
  static async downloadExcelAuditKebutuhanPeralatanHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT        
     "peralatanDanMesin",
      fungsi,
      kapasitas,
      "StudiPraformulasiID",
       "user_id"  ,"delegated_to" , "flag_update" , "createdAt" ,"updatedAt"  , status ,"changeDate" from "t_kebutuhanPeralatanDanMesin_hist"`,
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
        `attachment; filename="kebutuhan-peralatan-(${currentDate}).xlsx"`
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
