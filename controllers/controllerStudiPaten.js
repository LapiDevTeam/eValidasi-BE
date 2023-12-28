const {
  StudiPraformulasi,
  ProductBrief,
  DeskripsiProduct,
  FarmalogiKlinis,
  Stabilita,
  StudiPaten,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerStudiPaten {
  static async createStudiPaten(req, res, next) {
    try {
      const {
        nomorPaten,
        judulPaten,
        filingDate,
        expiredDate,
        claimPaten,
        infringePaten,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      const createStudiPaten = await StudiPaten.create({
        nomorPaten,
        judulPaten,
        filingDate,
        expiredDate,
        claimPaten,
        infringePaten,
        sumberPustaka,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create StudiPaten",
        data: createStudiPaten,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiPaten;
