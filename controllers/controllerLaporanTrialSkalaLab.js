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
  static async findAllLaporanTrialSkalaLab(req, res) {
    try {
      const { page, nomor, tanggal, namaProduk, komposisi, alasan, tujuan } =
        req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (nomor) searchParams.nomor = { [Op.iLike]: `%${nomor}%` };
      if (tanggal)
        searchParams.tanggal = {
          [Op.iLike]: `%${tanggal}%`,
        };
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (komposisi) searchParams.komposisi = { [Op.iLike]: `%${komposisi}%` };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };
      if (tujuan)
        searchParams.tujuan = {
          [Op.iLike]: `%${tujuan}%`,
        };

      const studi = await LaporanTrialSkalaLab.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(studi.count / limit) : "",
        studi,
      });
    } catch (err) {
      console.log(err, 12312312);
    }
  }

  static async deleteLaporanTrialSkalaLab(req, res) {
    try {
      const { id } = req.params;

      await LaporanTrialSkalaLab.destroy({
        where: { id: id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }

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

      // console.log(existingLaporan.dataValues.status, "exis 12312312");
      if (
        existingLaporan &&
        existingLaporan?.dataValues?.status === "Approved"
      ) {
        newRevisi = existingLaporan?.revisi + 1;
      } else if (
        existingLaporan &&
        existingLaporan?.dataValues?.status !== "Approved"
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

  static async updateDokumenAcuanLaporan(req, res) {
    try {
      const { LaporanTrialSkalaLabID } = req.params;

      const {
        productBriefNo,
        hasilStudiPraformulasiNo,
        protokolPenelitianNo,
        lainlain,
      } = req.body;
      const findLaporanTrialSkalaLabID = await LaporanTrialSkalaLab.findByPk(
        +LaporanTrialSkalaLabID
      );

      console.log(findLaporanTrialSkalaLabID, "< IDDDDDDD ");

      if (!findLaporanTrialSkalaLabID) throw { name: "NotFound" };
      const updateDokumenAcuan = await LaporanTrialSkalaLab.update(
        {
          productBriefNo: productBriefNo,
          hasilStudiPraformulasiNo: hasilStudiPraformulasiNo,
          protokolPenelitianNo: protokolPenelitianNo,
          lainlain: lainlain,
        },
        {
          where: {
            id: findLaporanTrialSkalaLabID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateDokumenAcuan);
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerLaporanTrialSkalaLab;
