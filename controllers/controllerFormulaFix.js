const { FormulaFix } = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
// const { checkStatusCatatanTrial } = require("../helpers/checkStatus");
// const { getStatusCatatanTrial } = require("../helpers/statusCatatanTrial");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");

class ControllerFormulaFix {
  static async createFormulaFix(req, res, next) {
    try {
      const { nama_user, bagian_user } = req.user;

      console.log(req.user, "<<");
      const {
        namaProduk,
        filter,
        komposisi,
        bentukSediaan,
        nomorBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
      } = req.body;

      const createFormulaFix = await FormulaFix.create({
        namaProduk: namaProduk || "",
        filter: filter || "",
        komposisi: komposisi || "",
        bentukSediaan: bentukSediaan || "",
        nomorBets: nomorBets || "",
        revisi: revisi || "",
        alasan: alasan || "",
        filter: filter || "",
        formulaA: formulaA || "",
        formulaB: formulaB || "",
        pic: nama_user || "",
        bagian: bagian_user || "",
      });

      res.status(201).json({
        message: "Success Create formulaFix",
        data: createFormulaFix,
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
}

module.exports = ControllerFormulaFix;
