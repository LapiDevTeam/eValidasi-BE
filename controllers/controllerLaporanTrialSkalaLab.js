const { LaporanTrialSkalaLab } = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const { AsyncLocalStorage } = require("async_hooks");
const { checkStatusProtokol } = require("../helpers/checkStatus");
const {
  getStatusProtokolSkalaLab,
} = require("../helpers/statusProtokolSkalaLab");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");

class ControllerLaporanTrialSkalaLab {
  static async createLaporanTrialSkalaLab(req, res, next) {
    // console.log("MASUKK PAK EKO");
    try {
      const {
        nomor,
        tanggal,
        revisi,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        hasilStudiPraformulasiNo,
        lainlain,
        ProductBriefId,
        status,
        rdSelection,
      } = req.body;

      console.log(namaProduk, " NAMAPRODUK");

      const existingLaporan = await LaporanTrialSkalaLab.findOne({
        where: {
          namaProduk: namaProduk,
        },
        order: [["createdAt", "DESC"]],
      });

      let newRevisi;

      console.log(existingLaporan, "exis");
      if (existingLaporan && existingLaporan.dataValues.status === "Approved") {
        newRevisi = existingLaporan.revisi + 1;
      } else if (
        existingLaporan &&
        existingLaporan.dataValues.status !== "Approved"
      ) {
        throw new MyError(
          404,
          "Product masih Draft, menunggu status menjadi approved"
        );
      } else {
        newRevisi = 0;
      }

      // const newRevisi = existingLaporan.revisi + 1;
      const createLaporanTrialSkalaLab = await LaporanTrialSkalaLab.create({
        nomor,
        tanggal,
        revisi: newRevisi,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        hasilStudiPraformulasiNo,
        lainlain,
        ProductBriefId,
        status,
        rdSelection,
      });

      res.status(201).json({
        message: "Success Create Laporan Trial Skala Lab with Revised Revisi",
        data: createLaporanTrialSkalaLab,
      });
      // } else if (existingProtokol.dataValues.status != "Approved") {
      //   throw new MyError(
      //     404,
      //     "Product masih Draft, menunggu status menjadi approved"
      //   );
      // }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerLaporanTrialSkalaLab;
