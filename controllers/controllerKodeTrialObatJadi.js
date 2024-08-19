const {
  m_kodeTrialObatJadi_template,
  m_kodeTrialObatJadi,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const m_kodetrialobatjadi = require("../models/m_kodetrialobatjadi");
const { Op } = require("sequelize");

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
  static async approveKodeTrialObatJadi(req, res, next) {
    try {
      const { user_id, delegated_to } = req.user;

      // Find the existing records
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } }, // Check if user_approve is null or empty
            { user_delegated: { [Op.or]: [null, ""] } }, // Check if user_delegated is null or empty
            { user_approve_date: { [Op.is]: null } }, // Check if user_approve_date is null
          ],
        },
        order: [["createdAt", "ASC"]],
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      // Update each record
      const updatedRecords = await Promise.all(
        existingRecords.map(async (record) => {
          try {
            return await record.update({
              user_approve: user_id,
              user_delegated: delegated_to,
              user_approve_date: new Date(), // Ensure this is a valid date
            });
          } catch (updateError) {
            console.error(
              `Error updating record with ID ${record.id}:`,
              updateError
            );
            throw updateError;
          }
        })
      );

      const newTemplate = existingRecords.map((el, index) => {
        return {
          kodeProduk: el.kodeProduk,
          namaObatJadi: el.namaObatJadi,
          kemasan: el.kemasan,
          komposisi: el.komposisi,
          keterangan: el.keterangan,
          user_id: "Sys",
          delegated_to: "Sys",
        };
      });

      await m_kodeTrialObatJadi_template.bulkCreate(newTemplate);

      res.status(200).json({
        message: "Data has been updated",
        data: updatedRecords,
      });
    } catch (err) {
      console.error("Error in approveKodeTrialObatJadi:", err);
      next(err);
    }
  }
  static async updateRencanaBerlaku(req, res, next) {
    try {
      const { user_id, delegated_to } = req.user;
      const { rencana_berlaku, rencana_revisi, rencana_alasan_desc } = req.body;

      // Validate the input
      if (!rencana_berlaku || !rencana_revisi || !rencana_alasan_desc) {
        return res.status(400).json({
          message: "Missing required fields",
        });
      }

      // Find records that need updating
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { rencana_berlaku: { [Op.is]: null } },
            { rencana_revisi: { [Op.or]: [null, ""] } },
            { rencana_alasan_desc: { [Op.or]: [null, ""] } },
          ],
        },
        order: [["createdAt", "ASC"]],
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      // Update the records
      const updatedRecords = await Promise.all(
        existingRecords.map((record) =>
          record.update({
            rencana_berlaku,
            rencana_revisi,
            rencana_alasan_desc,
          })
        )
      );

      res.status(200).json({
        message: "Data has been updated",
        data: updatedRecords,
      });
    } catch (err) {
      console.error("Error in updateRencanaBerlaku:", err);
      next(err);
    }
  }
  static async latestKodeTrialObatJadi(req, res, next) {
    try {
      const { user_id, delegated_to } = req.user;

      // Find the existing records
      const existingRecords = await m_kodeTrialObatJadi_template.findAll({
        where: {
          [Op.and]: [
            { user_approve: { [Op.or]: [null, ""] } }, // Check if user_approve is null or empty
            { user_delegated: { [Op.or]: [null, ""] } }, // Check if user_delegated is null or empty
            { user_approve_date: { [Op.is]: null } }, // Check if user_approve_date is null
          ],
        },
        order: [["createdAt", "ASC"]],
      });

      if (existingRecords.length === 0) {
        return res.status(404).json({
          message: "No records found",
        });
      }

      res.status(200).json({
        message: "Data has been updated",
        data: existingRecords,
      });
    } catch (err) {
      console.error("Error in approveKodeTrialObatJadi:", err);
      next(err);
    }
  }
}

module.exports = ControllerKodeTrialObatJadi;
