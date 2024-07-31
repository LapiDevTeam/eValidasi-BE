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
