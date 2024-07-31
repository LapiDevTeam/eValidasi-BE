const {
  t_studiPraformulasi,
  t_productBrief,
  t_deskripsiProduct,
  t_farmalogiKlinis,
  t_stabilita,
  t_studiPaten,
  t_karakteristikBahanAktif,
  t_karakteristikBahanKemasan,
  t_karakteristikBahanTambahan,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerStudiLiterature {
  static async getKarakteristikBahanAktif(req, res) {
    const { id } = req.params;
    try {
      const bahanAktifDetails = await t_karakteristikBahanAktif.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!bahanAktifDetails || bahanAktifDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(bahanAktifDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getKarakteristikBahanKemasan(req, res) {
    const { id } = req.params;
    try {
      const bahanKemasDetail = await t_karakteristikBahanKemasan.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!bahanKemasDetail || bahanKemasDetail.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(bahanKemasDetail, "<<");
      res.status(200).json(bahanKemasDetail);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getKarakteristikBahanTambahan(req, res) {
    const { id } = req.params;
    try {
      const bahanTamabahanDetails = await t_karakteristikBahanTambahan.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!bahanTamabahanDetails || bahanTamabahanDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(bahanTamabahanDetails, "<<");
      res.status(200).json(bahanTamabahanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = ControllerStudiLiterature;
