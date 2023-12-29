const {
  StudiPraformulasi,
  ProductBrief,
  DeskripsiProduct,
  FarmalogiKlinis,
  Stabilita,
  StudiPaten,
  KarakteristikBahanAktif,
  KarakteristikBahanKemasan,
  KarakteristikBahanTambahan,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerStudiLiterature {
  static async createKarakteristikBahanAktif(req, res, next) {
    try {
      const {
        namaBahan,
        parameter,
        hasilTinjauan,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;
      const createKarakteristikBahanAktif =
        await KarakteristikBahanAktif.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          StudiPraformulasiID,
        });
      res.status(201).json({
        message: "Success Create KarakteristikBahanAktif",
        data: createKarakteristikBahanAktif,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKarakteristikBahanKemasan(req, res, next) {
    try {
      const {
        namaBahan,
        parameter,
        hasilTinjauan,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;
      const createKarakteristikBahanKemasan =
        await KarakteristikBahanKemasan.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          StudiPraformulasiID,
        });
      res.status(201).json({
        message: "Success Create KarakteristikBahanKemasan",
        data: createKarakteristikBahanKemasan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKarakteristikBahanTambahan(req, res, next) {
    try {
      const {
        namaBahan,
        parameter,
        hasilTinjauan,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      console.log(req.body, " <<< req bodyu");

      const createKarakteristikBahanTambahan =
        await KarakteristikBahanTambahan.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          StudiPraformulasiID,
        });
      console.log(createKarakteristikBahanTambahan);
      res.status(201).json({
        message: "Success Create KarakteristikBahanTambahan",
        data: createKarakteristikBahanTambahan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiLiterature;
