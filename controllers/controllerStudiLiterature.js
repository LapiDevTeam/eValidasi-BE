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
  static async createKarakteristikBahanAktif(req, res, next) {
    try {
      const {
        namaBahan,
        parameter,
        hasilTinjauan,
        sumberPustaka,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;
      const createKarakteristikBahanAktif =
        await t_karakteristikBahanAktif.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          tableIndex: +tableIndex,
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
        tableIndex,
        StudiPraformulasiID,
      } = req.body;
      const createKarakteristikBahanKemasan =
        await t_karakteristikBahanKemasan.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          tableIndex: +tableIndex,
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
        tableIndex,
        StudiPraformulasiID,
      } = req.body;

      console.log(req.body, " <<< req bodyu");

      const createKarakteristikBahanTambahan =
        await t_karakteristikBahanTambahan.create({
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
          tableIndex: +tableIndex,
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
  static async getKarakteristikBahanAktif(req, res) {
    const { id } = req.params;
    try {
      const bahanAktifDetails = await t_karakteristikBahanAktif.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!bahanAktifDetails || bahanAktifDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(bahanAktifDetails, "<<");
      res.status(200).json(bahanAktifDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editKarakteristikBahanAktif(req, res, next) {
    const { id } = req.params;
    try {
      const { namaBahan, parameter, hasilTinjauan, tableIndex, sumberPustaka } =
        req.body;

      const [updatedRowsCount] = await t_karakteristikBahanAktif.update(
        {
          namaBahan,
          parameter,
          hasilTinjauan,
          tableIndex: +tableIndex,
          sumberPustaka,
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Karakteristikbahanaktif updated successfully",
        });
      } else {
        res.status(404).json({
          message: "Karakteristikbahanaktif not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editKarakteristikBahanKemasan(req, res, next) {
    const { id } = req.params;
    try {
      const { namaBahan, parameter, hasilTinjauan, sumberPustaka } = req.body;

      const [updatedRowsCount] = await t_karakteristikBahanKemasan.update(
        {
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "KarakteristikBahanKemasan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "KarakteristikBahanKemasan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editKarakteristikBahanTambahan(req, res, next) {
    const { id } = req.params;
    try {
      const { namaBahan, parameter, hasilTinjauan, sumberPustaka } = req.body;

      const [updatedRowsCount] = await t_karakteristikBahanTambahan.update(
        {
          namaBahan,
          parameter,
          hasilTinjauan,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "KarakteristikBahanTambahan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "KarakteristikBahanTambahan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiLiterature;
