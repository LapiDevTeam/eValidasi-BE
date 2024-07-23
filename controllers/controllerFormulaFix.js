const { t_formulaFix, t_formulaFix_status } = require("../models/index");
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

class ControllerFormulaFix {
  static async createFormulaFix(req, res, next) {
    try {
      const { nama_user, bagian_user } = req.user;

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

      const createFormulaFix = await t_formulaFix.create({
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
        // productBriefDetail.nama_pegawai,
        "formulaFix",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );

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
        bentukSediaan,
        nomorBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
      } = req.body;

      const [updatedRowsCount] = await t_formulaFix.update(
        {
          namaProduk: namaProduk || "",
          filter: filter || "",
          komposisi: komposisi || "",
          bentukSediaan: bentukSediaan || "",
          nomorBets: nomorBets || "",
          revisi: revisi || "",
          alasan: alasan || "",
          formulaA: formulaA || "",
          formulaB: formulaB || "",
          formulaC: formulaC || "",
        },
        {
          where: { id: id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Formula Fix updated successfully",
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

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "formulaFix",
        findFormulaFix.bagian,
        apprNo,
        user_id,
        nama_user
      );
      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let status;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        status = getStatusFormulaFix(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) status = "Closed";
      if (is_approve === false) {
        status = "Reject";
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
          status: status,
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
  static async deleteFormulaFix(req, res) {
    try {
      const { id } = req.params;

      await t_formulaFix.destroy({
        where: { id: +id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerFormulaFix;
