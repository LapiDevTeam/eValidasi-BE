const {
  StudiPraformulasi,
  ProductBrief,
  DeskripsiProduct,
  FarmalogiKlinis,
  Stabilita,
  t_studiPaten,
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

      const createStudiPaten = await t_studiPaten.create({
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
      const studipatenDetails = await t_studiPaten.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!studipatenDetails || studipatenDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

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

      const [updatedRowsCount] = await t_studiPaten.update(
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
  static async deleteStudiPaten(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const studipaten = await t_studiPaten.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (studipaten.length > 0) {
        await t_studiPaten.destroy({
          where: { StudiPraformulasiID: +id }, // Corrected the where clause
        });

        res.status(200).send({ msg: "succeed" });
      } else {
        res.status(200).send({ msg: "" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerStudiPaten;
