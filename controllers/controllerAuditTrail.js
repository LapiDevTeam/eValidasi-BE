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

      const headers = Object.keys(dataAudit[0] || {});
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
      console.log({ error });
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
  static async downloadExcelAuditFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `
        SELECT
          "id",
          "namaProduk",
          "filter",
          "komposisi",
          "kemasan",
          "formulaAcuan",
          "bentukSediaan",
          "besarBets",
          "revisi",
          "alasan",
          "formulaA",
          "formulaB",
          "formulaC",
          "formulaD",
          "keterangan",
          "pic",
          "bagian",
          "alasan_reject",
          "statusDokumen",
          "user_id",
          "delegated_to",
          "flag_update",
          "createdAt",
          "updatedAt",
          "status",
          "changeDate"
          FROM "t_formulaFix_hist";
        `,
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

      console.log({ asas: dataAudit[0] });
      const headers = Object?.keys(dataAudit[0] || {});
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
        `attachment; filename="formulafix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.log({ error });
      next(error);
    }
  }
  static async downloadExcelFormulaFixStatusHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "FormulaFixID",
          approver_no,
          is_approve,
          approver_name,
          approver_joblevel_id,
          approver_inisial,
          keterangan_reject,
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          "status",
          "changeDate"
        FROM public."t_formulaFix_status_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="FormulaFixStatusHist-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelPerhitunganBahanBakuFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          title,
          headers,
          contents,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_perhitunganBahanBakuFormulaFix_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.headers = JSON.stringify(el.headers); // Convert JSONB to string
        el.contents = JSON.stringify(el.contents); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="PerhitunganBahanBakuFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelKemasanFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "parameter",
          "hasilTinjauan",
          "tableIndex",
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_kemasanFormulaFix_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="KemasanFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProsesPengolahanFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          title,
          contents,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_formulaFix_prosesPengolahan_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.contents = JSON.stringify(el.contents); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProsesPengolahanFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProsesPengemasanFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          title,
          contents,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_formulaFix_prosesPengemasan_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.contents = JSON.stringify(el.contents); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProsesPengemasanFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelRancanganSpesifikasiObatJadiFormulaFixHist(
    req,
    res,
    next
  ) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "parameter",
          spesifikasi,
          referensi,
          justifikasi,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_formulaFix_rancanganSpesifikasiObatJadi_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="RancanganSpesifikasiObatJadiFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelDataStabilitasFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          upload,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_upload,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_formulaFix_dataStabilitas_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string for Excel compatibility
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="DataStabilitasFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelAcuanCatatanTrialFormulaFixHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          upload,
          "FormulaFixID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_formulaFix_acuanCatatanTrial_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string for Excel compatibility
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="AcuanCatatanTrialFormulaFix-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelKelengkapanDokumenHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          dokumen,
          kelengkapan,
          upload,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_kelengkapanDokumen_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string for Excel compatibility
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="KelengkapanDokumen-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProdukTerdampakHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaProduk",
          keterangan,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_produkTerdampak_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProdukTerdampak-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProposalDiversifikasiHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "noProposal",
          "rdSelection",
          "namaBahanBaku",
          produsen,
          pemasok,
          "statusDokumen",
          alasan_reject,
          "rancanganTrial",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_proposalDiversifikasi_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProposalDiversifikasi-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelPersentaseDalamFormulaHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaProduk",
          "persenDalamFormula",
          "skorA",
          "bobotB",
          jumlah,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_persentaseDalamFormula_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="PersentaseDalamFormula-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelJumlahBetsPerTahunHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaProduk",
          "jumlahBets",
          "skorA",
          "bobotB",
          jumlah,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_jumlahBetsPerTahun_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="JumlahBetsPerTahun-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelTotalSkoringHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaProduk",
          "persentaseDalamFormula",
          "pengaruhPadaPerformaProses",
          "jumlahBetsPerTahun",
          "jumlahTotal",
          keterangan,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_totalSkoring_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="TotalSkoring-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelTimelineTrialHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "dampakPerubahan",
          pic,
          prioritas,
          "tenggatWaktu",
          realisasi,
          "realisasiDate",
          "statusImplementasi",
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_timelineTrial_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.tenggatWaktu = el?.tenggatWaktu
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.realisasiDate = el?.realisasiDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="TimelineTrial-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProposalDiversifikasiStatusHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "ProposalDiversifikasiID",
          approver_no,
          is_approve,
          approver_name,
          approver_joblevel_id,
          approver_inisial,
          keterangan_reject,
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_proposalDiversifikasi_status_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProposalDiversifikasiStatus-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelPengaruhPadaPerformaProsesHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaProduk",
          "jumlahPenyimpangan",
          "skorA",
          "bobotB",
          jumlah,
          "ProposalDiversifikasiID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          status,
          "changeDate"
        FROM public."t_pengaruhPadaPerformaProses_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="PengaruhPadaPerformaProses-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelProtokolValidasiHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "jenisDokumen",
          "filter",
          "namaProduk",
          "noDokumen",
          revisi,
          alasan,
          upload,
          "statusDokumen",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_protokolValidasi_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ProtokolValidasi-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelAktivitasDanWaktuPencapaianHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query data from the database
      const data = await sequelize.query(
        `
        SELECT
          id,
          "rencanaTersediaBahanAwal",
          "pencapaianTersediaBahanAwal",
          "rencanaOptimasiFormula",
          "pencapaianOptimasiFormula",
          "rencanaStabilitaSkalaLab",
          "pencapaianStabilitaSkalaLab",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."t_aktivitasDanWaktuPencapaian_hist";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Extract headers from the first data object
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 25; // Adjust column width for readability
      });

      // Populate data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send the file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="AktivitasDanWaktuPencapaian-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelKesimpulanFormulaTerpilihHist(req, res, next) {
    try {
      const tableName = "t_kesimpulanFormulaTerpilih_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          komposisi,
          jumlah,
          "apakahAdaPadaKomposisiOriginator",
          justifikasi,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="KesimpulanFormulaTerpilih-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelRingkasanHasilStudiCppHist(req, res, next) {
    try {
      const tableName = "t_ringkasanHasilStudiCpp_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "prosesParameter",
          "CqaYangDiStudi",
          "rangeStudi",
          "controlStrategy",
          justifikasi,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="RingkasanHasilStudiCpp-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelKesimpulanProsesTerpilihHist(req, res, next) {
    try {
      const tableName = "t_kesimpulanProsesTerpilih_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "tahapanProses",
          "parameter",
          justifikasi,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="KesimpulanProsesTerpilih-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelUsulanPenelitianProdukHist(req, res, next) {
    try {
      const tableName = "t_usulanPenelitianProduk_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          faktor,
          "parameter",
          "usulanSkalaPilot",
          justifikasi,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="UsulanPenelitianProduk-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelUpdateRiskAssessmentHist(req, res, next) {
    try {
      const tableName = "t_updateRiskAssessment_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "cqaHeader",
          "rows",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.cqaHeader = JSON.stringify(el.cqaHeader); // Convert JSONB to string
        el.rows = JSON.stringify(el.rows); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="UpdateRiskAssessment-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelUpdateRiskAssessmentBahanAktifHist(req, res, next) {
    try {
      const tableName = "t_updateRiskAssessmentBahanAktif_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "cqaHeader",
          "rows",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.cqaHeader = JSON.stringify(el.cqaHeader); // Convert JSONB to string
        el.rows = JSON.stringify(el.rows); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="UpdateRiskAssessmentBahanAktif-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelUpdateRiskAssessmentBahanTambahanHist(
    req,
    res,
    next
  ) {
    try {
      const tableName = "t_updateRiskAssessmentBahanTambahan_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "cqaHeader",
          "rows",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.cqaHeader = JSON.stringify(el.cqaHeader); // Convert JSONB to string
        el.rows = JSON.stringify(el.rows); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="UpdateRiskAssessmentBahanTambahan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelUpdateRiskAssessmentKemasanHist(req, res, next) {
    try {
      const tableName = "t_updateRiskAssessmentKemasan_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "cqaHeader",
          "rows",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.cqaHeader = JSON.stringify(el.cqaHeader); // Convert JSONB to string
        el.rows = JSON.stringify(el.rows); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="UpdateRiskAssessmentKemasan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelRingkasanHasilStudiCmaHist(req, res, next) {
    try {
      const tableName = "t_ringkasanHasilStudiCma_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          title,
          content,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.content = JSON.stringify(el.content); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="RingkasanHasilStudiCma-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLaporanTrialSkalaLabStatusHist(req, res, next) {
    try {
      const tableName = "t_laporanTrialSkalaLab_status_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "LaporanTrialSkalaLabID",
          approver_no,
          is_approve,
          approver_name,
          approver_joblevel_id,
          approver_inisial,
          keterangan_reject,
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LaporanTrialSkalaLabStatus-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSStudiScreeningSourceApiHist(req, res, next) {
    try {
      const tableName = "t_LTS_studiScreeningSourceApi_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          permasalahan,
          tujuan,
          "skalaStudi",
          "penyimpananSampel",
          "tahapanStudi",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSStudiScreeningSourceApi-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSKriteriaPenerimaanHist(req, res, next) {
    try {
      const tableName = "t_LTS_kriteriaPenerimaan_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "parameter",
          spesifikasi,
          referensi,
          "tableIndex",
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSKriteriaPenerimaan-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSStudiCppTerhadapCqaHist(req, res, next) {
    try {
      const tableName = "t_LTS_studiCppTerhadapCqa_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          judul,
          content,
          upload,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSStudiCppTerhadapCqa-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSBahanAktifCmaHist(req, res, next) {
    try {
      const tableName = "t_LTS_bahanAktifCma_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaBahan",
          judul,
          content,
          upload,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSBahanAktifCma-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSBahanTambahanCmaHist(req, res, next) {
    try {
      const tableName = "t_LTS_bahanTambahanCma_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          "namaBahan",
          judul,
          content,
          upload,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSBahanTambahanCma-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
  static async downloadExcelLTSHasilDanPembahasanOrientasiHist(req, res, next) {
    try {
      const tableName = "t_LTS_hasilDanPembahasanOrientasi_hist"; // Dynamic table name

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      // Query the database for data from the table
      const data = await sequelize.query(
        `
        SELECT
          id,
          judul,
          content,
          upload,
          "LaporanTrialSkalaLabID",
          user_id,
          delegated_to,
          flag_update,
          "createdAt",
          "updatedAt",
          status,
          "changeDate"
        FROM public."${tableName}";
        `,
        { type: sequelize.QueryTypes.SELECT }
      );

      // Format date fields to a readable format
      data?.forEach((el) => {
        el.changeDate = el?.changeDate
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
        el.upload = JSON.stringify(el.upload); // Convert JSONB to string
      });

      // Define headers based on the data keys
      const headers = Object?.keys(data[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      // Add a title and metadata rows
      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      // Add headers to the worksheet
      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20; // Set column width for better readability
      });

      // Add data rows
      data.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5; // Data starts after the header row
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers and send file
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="LTSHasilDanPembahasanOrientasi-(${currentDate}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}

module.exports = ControllerAuditTrail;
