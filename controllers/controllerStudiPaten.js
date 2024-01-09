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
  static async getStudiPaten(req, res) {
    const { id } = req.params;
    try {
      const studipatenDetails = await StudiPaten.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!studipatenDetails || studipatenDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      console.log(studipatenDetails, "<<");
      res.status(200).json(studipatenDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editStudiPaten(req, res, next) {
    const { id } = req.params;
    try {
      const {
        nomorPaten,
        judulPaten,
        filingDate,
        expiredDate,
        claimPaten,
        infringePaten,
        sumberPustaka,
      } = req.body;

      const [updatedRowsCount] = await StudiPaten.update(
        {
          nomorPaten,
          judulPaten,
          filingDate,
          expiredDate,
          claimPaten,
          infringePaten,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "stud updated successfully",
        });
      } else {
        res.status(404).json({
          message: "stud not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiPaten;
