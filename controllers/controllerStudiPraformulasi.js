const { StudiPraformulasi } = require("../models/index");
const MyError = require("../helpers/errors");

class ControllerStudiPraformulasi {
  static async createStudiPraformulasi(req, res, next) {
    try {
      const {
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        studiOriginatorId,
        studiLiterature,
        studiPaten,
        ujiKompatibilitas,
        kesimpulan,
        ProductBriefId,
      } = req.body;

      const createdStudiPraformulasi = await StudiPraformulasi.create({
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        studiOriginatorId,
        studiLiterature,
        studiPaten,
        ujiKompatibilitas,
        kesimpulan,
        ProductBriefId,
      });

      res.status(201).json({
        message: "Success Create CUY",
        data: createdStudiPraformulasi,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiPraformulasi;
