const { t_protokolValidasi, t_protokolValidasi_status } = require("../models"); // Adjust the path to your models
const moment = require("moment");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");
const {
  checkStatusProductBrief,
  checkStatusProtokolValidasi,
} = require("../helpers/checkStatus");
const { getStatus } = require("../helpers/statusProductBrief");
const { PDFDocument, rgb } = require("pdf-lib");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");
const {
  getStatusProtokolValidasi,
} = require("../helpers/statusProtokolValidasi");

class ControllerProtokolValidasi {
  static async findAllProtokolValidasi(req, res) {
    try {
      const { page, namaProduk, filter, noDokumen, alasan } = req.query;
      const size = page ? 20 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (filter) searchParams.filter = { [Op.iLike]: `%${filter}%` };
      if (noDokumen) searchParams.noDokumen = { [Op.iLike]: `%${noDokumen}%` };

      if (alasan) searchParams.alasan = { [Op.iLike]: `%${alasan}%` };

      const brief = await t_protokolValidasi.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(brief.count / limit) : "",
        brief,
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async getProtokolValidasi(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      const { id } = req.params;

      let protokolValidasiDetails;
      console.log(joblevel_id_user, "< job level");
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        console.log(id, "<< id");
        protokolValidasiDetails = await t_protokolValidasi?.findOne({
          where: {
            id,
          },
          include: {
            model: t_protokolValidasi_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_protokolValidasi_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
        console.log(protokolValidasiDetails, "<< detil");
      } else {
        console.log("test");
        protokolValidasiDetails = await t_protokolValidasi.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_protokolValidasi_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_protokolValidasi_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }
      console.log(protokolValidasiDetails, "<<< DETAILS");
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = bagian_user;
      const apprNo = await checkStatusProtokolValidasi(id);
      console.log(apprNo, "< < DEBt ID");
      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "protokolValidasi",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );
      console.log(isApprove, "<< asdasda");
      if (isApprove.message) throw new MyError(400, isApprove.message);

      res.status(200).json({
        protokolValidasi: protokolValidasiDetails,
        isApprove,
      });
    } catch (error) {
      console.error("Error fetching protokol validasi details:", error);
      res
        .status(500)
        .json({ error: "Error fetching protokol validasi details" });
    }
  }
  static async uploadPdf(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, bagian_user } = req.user;
      const {
        jenisDokumen,
        namaProduk,
        noDokumen,
        alasan,
        revisi,
        filter,
        upload,
      } = req.body;

      // Check if model is correctly loaded
      if (!t_protokolValidasi) {
        console.error("Model 't_ProtokolValidasi' is not defined.");
        return res
          .status(500)
          .json({ error: "Server error: Model not found." });
      }

      // Save data to the database
      const pdf = await t_protokolValidasi.create({
        jenisDokumen: jenisDokumen,
        namaProduk: namaProduk,
        noDokumen: noDokumen,
        alasan: alasan,
        revisi: revisi,
        filter: filter,
        upload: upload, // Store the PDF binary data
        bagian: bagian_user || "",
        statusDokumen: "Draft",
      });

      res.status(201).json({
        message: "Success Create CatatanTrial",
        data: pdf,
      });
    } catch (error) {
      console.error("Upload PDF error:", error);
      res.status(500).json({ error: "Error uploading PDF" });
    }
  }

  static async getUpload(req, res, next) {
    try {
      const { id } = req.params; // Assuming the ID is provided in the route parameters

      // Fetch the record by ID from the t_protokolValidasi model
      const image = await t_protokolValidasi.findOne({
        where: {
          id: id, // Adjust 'id' if your model uses a different field name
        },
      });

      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Convert the image to JSON
      const imageJson = image.toJSON();
      console.log(imageJson, "<< aa image");

      // Convert the binary data (if exists) to base64 for easy use in the frontend
      if (imageJson.upload) {
        imageJson.upload = Buffer.from(imageJson.upload).toString("base64");
      } else {
        imageJson.upload = null;
      }

      // Send the processed image data back in the response
      res.json(imageJson);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching image" });
    }
  }

  static async approveProtokol(req, res, next) {
    try {
      const {
        user_id,
        nama_user,
        joblevel_id_user,
        inisial_user,
        delegated_to,
      } = req.user;
      const { is_approve, keterangan_reject = null } = req.body;
      const { id } = req.params;
      const findProtokolValidasi = await t_protokolValidasi.findByPk(+id);
      if (!findProtokolValidasi)
        throw new MyError(404, "Form CatatanTrial tidak ditemukan");
      const apprNo = await checkStatusCatatanTrial(id);

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "protokolValidasi",
        findProtokolValidasi.bagian,
        apprNo,
        user_id,
        nama_user
      );
      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let statusDokumen;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        statusDokumen = getStatusProtokolValidasi(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) statusDokumen = "Closed";
      if (is_approve === false) {
        statusDokumen = "Reject";
        await t_protokolValidasi_status.destroy({
          where: { ProtokolValidasiID: +id },
        });
      }

      await t_protokolValidasi_status.create({
        ProtokolValidasiID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_protokolValidasi.update(
        {
          statusDokumen: statusDokumen,
          alasan_reject: keterangan_reject,
          user_id,
          // delegated_to,
        },
        {
          where: {
            id,
          },
        }
      );
      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }

  static async updateUploadProtokol(req, res) {
    try {
      const { ProtokolID } = req.params;
      const cat = await t_protokolValidasi.findByPk(+ProtokolID);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_protokolValidasi_status.destroy({
      //     where: { ProtokolID: +ProtokolID },
      //   });
      //   await t_protokolValidasi.update(
      //     {
      //       is_approve_1: "",
      //       approver_name_1: "",
      //       approver_user_id_1: "",
      //       approver_delegated_to_1: "",
      //       approver_tanggal_1: null,
      //       keterangan_reject_1: "",
      //       statusDokumen: "Draft",
      //     },
      //     {
      //       where: {
      //         id,
      //       },
      //     }
      //   );
      // }
      const upload = req.body;
      console.log(upload, "< 123");

      const find = await t_protokolValidasi.findByPk(+ProtokolID);

      console.log(find.id, "< ID");

      if (!find) throw { name: "NotFound" };
      const updateUpload = await t_protokolValidasi.update(
        { upload }, // Directly using upload array
        {
          where: { id: find.id },
          returning: true,
        }
      );
      console.log(updateUpload, "<< update");

      res.status(200).json(updateUpload);
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProtokolValidasi;
