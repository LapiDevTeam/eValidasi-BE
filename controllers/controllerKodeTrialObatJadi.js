const {
  m_kodeTrialObatJadi_template,
  m_kodeTrialObatJadi,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const m_kodetrialobatjadi = require("../models/m_kodetrialobatjadi");

class ControllerKodeTrialObatJadi {
  static async createKodeTrialObatJadiTemplate(req, res, next) {
    try {
      const {
        kodeProduk,
        namaObatJadi,
        kemasan,
        komposisi,
        keterangan,
        rencana_berlaku,
        rencana_revisi,
      } = req.body;

      //   const existingObatJadi = await m_kodeTrialObatJadi_template.findOne({
      //     where: {
      //       nomor: nomor,
      //     },
      //     order: [["createdAt", "DESC"]],
      //   });

      const { user_id, delegated_to } = req.user;

      const createKodeTrialObatJadiTemplate =
        await m_kodeTrialObatJadi_template.create({
          kodeProduk: kodeProduk,
          namaObatJadi: namaObatJadi,
          kemasan: kemasan,
          komposisi: komposisi,
          keterangan: keterangan,
          rencana_berlaku: rencana_berlaku,
          rencana_revisi: rencana_revisi,
          user_id,
          delegated_to,
        });

      res.status(201).json({
        message: "Data has been saved",
        data: createKodeTrialObatJadiTemplate,
      });
    } catch (err) {
      console.error(err, "<< err");
      next(err);
    }
  }
  static async getKodeTrialObatJadi(req, res) {
    try {
      const {
        kodeProduk,
        namaObatJadi,
        kemasan,
        komposisi,
        keterangan,
        rencana_berlaku,
        rencana_revisi,
      } = req.query;

      const kodeTrialObatJadi = await m_kodeTrialObatJadi.findAll({
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        kodeTrialObatJadi,
      });
    } catch (err) {
      console.error(err); // Use console.error for better error logging
      res.status(500).json({ error: "Internal Server Error" }); // Provide a proper error response
    }
  }
}

module.exports = ControllerKodeTrialObatJadi;
