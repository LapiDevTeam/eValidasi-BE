const { t_protokolValidasi } = require("../models"); // Adjust the path to your models

const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");
const { checkStatusProductBrief } = require("../helpers/checkStatus");
const { getStatus } = require("../helpers/statusProductBrief");
const { PDFDocument, rgb } = require("pdf-lib");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");

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
      const { id } = req.params;

      const protokolValidasi = await t_protokolValidasi.findByPk(id);

      if (!protokolValidasi) {
        return res.status(404).json({ error: "Protokol validasi not found" });
      }

      if (protokolValidasi) {
        protokolValidasi.upload = Buffer.from(protokolValidasi.upload).toString(
          "base64"
        );
      } else {
        protokolValidasi.upload = null;
      }

      res.status(200).json({
        message: "Success fetch protokol validasi details",
        data: protokolValidasi,
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
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const { jenisDokumen, namaProduk, noDokumen, alasan, revisi, filter } =
        req.body;

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
        upload: req.file.buffer, // Store the PDF binary data
      });

      if (pdf) {
        pdf.upload = Buffer.from(pdf.upload).toString("base64");
      } else {
        pdf.upload = null;
      }
      console.log(pdf, "<<");

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

  static async approveProtokol(req, res) {
    const { id } = req.params;
    const { nomorApprover } = req.query;
    console.log(req.user, "< aaaa");

    let x, y;
    let approverName;

    // Validate approver number
    if (nomorApprover === "1") {
      x = 50;
      y = 95;
      approverName = `Approved by ${req.user.user_id} as ${req.user.delegated_to}`;
    } else if (nomorApprover === "2") {
      x = 295;
      y = 95;
      approverName = `Approved by ${req.user.user_id} as ${req.user.delegated_to}`;
    } else {
      return res.status(400).send("Invalid approver number.");
    }

    try {
      // Fetch PDF from database using the provided id
      const pdfRecord = await t_protokolValidasi.findByPk(id);
      if (!pdfRecord) {
        return res.status(404).send("PDF not found.");
      }

      const existingPdfBytes = pdfRecord.upload;

      // Load the existing PDF
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Modify the first page, adjust if needed

      // Add the approver's name and position it at the specified coordinates
      firstPage.drawText(`${approverName}`, {
        x: parseFloat(x),
        y: parseFloat(y),
        size: 12, // Font size
        color: rgb(0, 0, 0), // Text color (black)
      });

      // Save the modified PDF as bytes
      const pdfBytes = await pdfDoc.save();

      // Update the PDF record with the modified content
      await pdfRecord.update({ upload: Buffer.from(pdfBytes) });

      // Send a success response
      res.status(200).send("File approved and modified successfully!");
    } catch (error) {
      console.error(error);
      res.status(500).send(`Error: ${error.message}`);
    }
  }
}

module.exports = ControllerProtokolValidasi;
