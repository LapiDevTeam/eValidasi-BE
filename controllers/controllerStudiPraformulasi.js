const { StudiPraformulasi, ProductBrief } = require("../models/index");
const MyError = require("../helpers/errors");

class ControllerStudiPraformulasi {
  static async createStudiPraformulasi(req, res, next) {
    try {
      const {
        nomor,
        tanggalPenyusunan,
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
        nomor,
        tanggalPenyusunan,
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
  static async getProductBrief(req, res) {
    try {
      const noProductBrief = await ProductBrief.findAll({
        attributes: [
          "id",
          "productBrief",
          "nama",
          "kode",
          "kemasan",
          "bahanAktifDanDosis",
        ], // Replace 'columnName' with the actual name of the column you want
      });
      if (!noProductBrief) throw new MyError(400, "notFound!");

      res.status(200).json(noProductBrief);
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerStudiPraformulasi;
