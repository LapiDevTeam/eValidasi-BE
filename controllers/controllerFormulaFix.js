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
        formulaC,
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
        formulaC: formulaC || "",
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

      const formula = await FormulaFix.findAndCountAll({
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
}

module.exports = ControllerFormulaFix;
