const {
  t_studiPraformulasi,
  t_productBrief,
  t_deskripsiProduct,
  t_farmakologiKlinis,
  t_stabilita,
  t_formula,
  t_kemasan,
  t_ujiInkompatibilitas,
  t_kontrolBahan,
  sequelize,
  StudiPaten,
  t_karakteristikBahanAktif,
  t_karakteristikBahanTambahan,
  t_karakteristikBahanKemasan,
  t_karakteristikFisikakimia,
  t_qtpp,
  t_cqa,
  t_formulaProtokol,
  t_prosesPembuatan,
  t_kemasanProtokolSkalaLab,
  t_zatAktif,
  t_bahanTambahan,
  t_kemasanPrimer,
  t_mappingProcess,
  t_cpp,
  t_rencanaAktivitas,
  t_material,
  t_originatorAtauKompetitor,
  t_kebutuhanPeralatanDanMesin,
  t_studiPaten,
  t_studiPraformulasi_status,
  t_matrixPerbandingan,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const t_ujiinkompatibilitas = require("../models/t_ujiinkompatibilitas");
const { checkStatusStudi } = require("../helpers/checkStatus");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");
const { transporter } = require("../config/configNodeMailer");
const { fetchApproverInisial } = require("../services/mssqlService");
const { getStatus } = require("../helpers/statusProductBrief");
const t_matrixperbandingan = require("../models/t_matrixperbandingan");
const {
  getStatusStudiPraformulasi,
} = require("../helpers/statusStudiPraformulasi");

class ControllerStudiPraformulasi {
  static async getAllAlasanByNomor(req, res) {
    const { nomor, revisi } = req.params;
    const convertedNomor = nomor.replace(/-/g, "/");
    console.log(nomor, "<");

    const revisionNumbers = [];
    for (let i = 0; i <= revisi; i++) {
      revisionNumbers.push(i);
    }

    try {
      const alasan = await t_studiPraformulasi.findAll({
        where: {
          nomor: convertedNomor,
          revisi: revisionNumbers,
        },
        attributes: ["nomor", "alasan", "revisi", "statusDokumen"],
      });

      res.status(200).json(alasan);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  // approver pemohon
  static async approvePemohon(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, inisial_user, bagian_user } =
        req.user;
      console.log(req.user, "<< user");
      const {
        is_approve_1,
        approver_tanggal_1,
        keterangan_reject_1,
        is_approve_2,
        statusDokumen,
        keterangan_reject_2,
      } = req.body;
      const { id } = req.params;

      if (bagian_user === "RD1" || bagian_user === "RD1") {
        await t_studiPraformulasi.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
            statusDokumen: statusDokumen,
          },
          {
            where: {
              id,
            },
          }
        );
      } else if (bagian_user === "RD3") {
        await t_studiPraformulasi.update(
          {
            is_approve_2,
            approver_name_2: nama_user,
            approver_user_id_2: user_id,
            approver_delegated_to_2: delegated_to,
            approver_tanggal_2: new Date(),
            keterangan_reject_2: keterangan_reject_2,
            statusDokumen: statusDokumen,
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const findStudiPemohon = await t_studiPraformulasi.findByPk(+id);
      let isEmail = false;
      console.log(findStudiPemohon?.dataValues, " < 1");

      console.log(req.body, "<< body");

      if (!findStudiPemohon)
        throw new MyError(404, "Form studi tidak ditemukan");

      if (findStudiPemohon?.is_approve_1 && is_approve_2) {
        isEmail = true;
      }
      if (is_approve_1 && findStudiPemohon?.is_approve_2) {
        isEmail = true;
      }

      console.log(isEmail, "< email");

      if (isEmail) {
        const info = await transporter.sendMail({
          from: `[Notifikasi][StudiPraformulasi] - ${findStudiPemohon?.namaProduk} <no_reply_it@lapilabs.co.id>`,
          to: ["gunardi.cahyadi@lapilabs.co.id", "cahyadigunardi@gmail.com"], // list of receivers
          subject: "Studi Praformulasi", // Subject line
          text: "Hellow world?", // plain text body
          html: `<b>
          <html>
          <p> Dear Bapak / Ibu di tempat,
Bersamaan dengan email ini, diberitahukan bahwa Studi Praformulasi ${findStudiPemohon?.namaProduk} telah selesai disusun. Mohon segera di review.
 
Demikian disampaikan, terima kasih atas perhatian dan kerjasamanya.
 
eFormulation System</p>
          </html>
          </b>`,
        });
        console.log("Message sent: %s", info.messageId, "<< email");
        await t_studiPraformulasi.update(
          {
            statusDokumen: "Menunggu Approve Manager",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      res.status(201).json({ message: "Success Approved" });
    } catch (err) {
      console.log(err);
    }
  }
  static async approveStudi(req, res, next) {
    try {
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
      } = req.user;

      const { is_approve, keterangan_reject = null } = req.body;
      const { id } = req.params;
      const findStudi = await t_studiPraformulasi?.findByPk(+id);

      if (!findStudi)
        throw new MyError(404, "Form StudiPraformulasi tidak ditemukan");
      const apprNo = await checkStatusStudi(id);

      const dataApprove = await approverRecordset(
        "studiPraformulasi",
        findStudi.rdSelection,
        apprNo,
        user_id,
        nama_user
      );
      console.log(dataApprove, "<< DATA approve");

      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let statusDokumen;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        statusDokumen = getStatusStudiPraformulasi(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );

      console.log(statusDokumen, "<< dok");

      if (dataApprove.recordset1.length === 0) statusDokumen = "Approved";
      if (is_approve === false) statusDokumen = "Reject";

      await t_studiPraformulasi_status.create({
        StudiPraformulasiID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_studiPraformulasi.update(
        {
          statusDokumen: statusDokumen,
          alasan_reject: keterangan_reject,
          // user_id,
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
  static async findAllStudiPraformulasi(req, res) {
    try {
      const {
        page,
        nomor,
        tanggalPenyusunan,
        tanggalAddendum,
        addendumKe,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        ProductBriefId,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (nomor) searchParams.nomor = { [Op.iLike]: `%${nomor}%` };
      if (tanggalPenyusunan)
        searchParams.tanggalPenyusunan = {
          [Op.iLike]: `%${tanggalPenyusunan}%`,
        };
      if (tanggalAddendum)
        searchParams.tanggalAddendum = { [Op.iLike]: `%${tanggalAddendum}%` };
      if (addendumKe)
        searchParams.addendumKe = { [Op.iLike]: `%${addendumKe}%` };
      if (namaProduk) searchParams.namaProduk = +namaProduk;
      if (komposisi) searchParams.komposisi = { [Op.iLike]: `%${komposisi}%` };
      if (kemasan)
        searchParams.kemasan = {
          [Op.iLike]: `%${kemasan}%`,
        };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };
      if (tujuan)
        searchParams.tujuan = {
          [Op.iLike]: `%${tujuan}%`,
        };
      if (productBriefNo)
        searchParams.productBriefNo = {
          [Op.iLike]: `%${productBriefNo}%`,
        };
      if (ProductBriefId)
        searchParams.ProductBriefId = {
          [Op.iLike]: `%${ProductBriefId}%`,
        };

      const studi = await t_studiPraformulasi.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(studi.count / limit) : "",
        studi,
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async deleteStudiPraformulasi(req, res) {
    try {
      const { id } = req.params;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
      } = req.user;

      const flag_update = "UPDATE FOR DELETE";

      const findStudiPraformulasi = await t_studiPraformulasi.findByPk(+id);
      if (!findStudiPraformulasi)
        throw new MyError(404, "Form Studi Praformulasi tidak di temukan");

      await t_studiPraformulasi_status.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_studiPraformulasi_status.destroy({
        where: { StudiPraformulasiID: +id },
      });

      await t_studiPraformulasi.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { id: +id },
        }
      );

      await t_studiPraformulasi.destroy({
        where: { id: +id },
      });

      await t_deskripsiProduct.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );

      await t_deskripsiProduct.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_farmakologiKlinis.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );

      await t_farmakologiKlinis.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_formula.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_formula.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_cqa.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_cqa.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_formulaProtokol.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_formulaProtokol.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_stabilita.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_stabilita.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_karakteristikBahanAktif.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_karakteristikBahanAktif.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_karakteristikBahanTambahan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_karakteristikBahanTambahan.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_karakteristikBahanKemasan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_karakteristikBahanKemasan.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_studiPaten.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_studiPaten.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_ujiInkompatibilitas.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_ujiInkompatibilitas.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_prosesPembuatan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_prosesPembuatan.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_kemasanProtokolSkalaLab.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_kemasanProtokolSkalaLab.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_zatAktif.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_zatAktif.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_bahanTambahan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_bahanTambahan.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_kemasanPrimer.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_kemasanPrimer.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_mappingProcess.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_mappingProcess.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_cpp.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_cpp.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_rencanaAktivitas.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_rencanaAktivitas.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_material.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_material.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_originatorAtauKompetitor.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_originatorAtauKompetitor.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_kebutuhanPeralatanDanMesin.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_kebutuhanPeralatanDanMesin.destroy({
        where: { StudiPraformulasiID: id },
      });
      await t_karakteristikFisikakimia.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_karakteristikFisikakimia.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_qtpp.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_qtpp.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_kemasan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_kemasan.destroy({
        where: { StudiPraformulasiID: id },
      });

      await t_matrixPerbandingan.update(
        {
          user_id,
          delegated_to,
          flag_update,
        },
        {
          where: { StudiPraformulasiID: +id },
        }
      );
      await t_matrixPerbandingan.destroy({
        where: { StudiPraformulasiID: id },
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
  static async createStudiPraformulasi(req, res, next) {
    try {
      const {
        nomor,
        tanggalPenyusunan,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        ProductBriefId,
        statusDokumen,
        rdSelection,
        tujuanScreening,
        kesimpulanScreening,
        kesimpulan,
        is_approve_1,
        approver_tanggal_1,
        keterangan_reject_1,
        is_approve_2,
        keterangan_reject_2,
      } = req.body;
      console.log(req.body, "< req body");

      const existingStudiPraformulasi = await t_studiPraformulasi.findOne({
        where: {
          nomor: nomor,
        },
        order: [["createdAt", "DESC"]],
      });

      let newRevisi;

      if (
        existingStudiPraformulasi &&
        existingStudiPraformulasi.dataValues.statusDokumen === "Approved"
      ) {
        newRevisi = existingStudiPraformulasi.revisi + 1;
      } else if (
        existingStudiPraformulasi &&
        existingStudiPraformulasi.dataValues.statusDokumen !== "Approved"
      ) {
        throw new MyError(
          404,
          "Studi Praformulasi masih Draft, menunggu status menjadi approved"
        );
      } else {
        newRevisi = 0;
      }

      if (!namaProduk) {
        throw new MyError(400, "Nama Produk is required !");
      }

      const createdStudiPraformulasi = await t_studiPraformulasi.create({
        nomor: nomor,
        tanggalPenyusunan: tanggalPenyusunan,
        namaProduk: namaProduk,
        komposisi: komposisi,
        kemasan: kemasan,
        alasan: alasan,
        tujuan: tujuan,
        productBriefNo: productBriefNo,
        ProductBriefId: ProductBriefId,
        statusDokumen: statusDokumen,
        rdSelection: rdSelection,
        revisi: newRevisi,
        tujuanScreening: tujuanScreening,
        kesimpulanScreening: kesimpulanScreening,
        kesimpulan: kesimpulan,
      });

      res.status(201).json({
        message: "Data has been saved",
        data: createdStudiPraformulasi,
      });
    } catch (err) {
      console.error(err, "<< err");
      next(err);
    }
  }
  //////////////////////////
  static async handleSaveDeskripsiProduct(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_deskripsiProduct.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });
      console.log(prevKomposisi, "< prev");

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_deskripsiProduct.create(
              {
                namaStudi: newItem?.namaStudi || "",
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                dosage: newItem?.dosage || "",
                labelClaim: newItem?.labelClaim || "",
                rutePemberian: newItem?.rutePemberian || "",
                aturanPakai: newItem?.aturanPakai || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_deskripsiProduct.update(
              {
                namaStudi: newItem?.namaStudi || "",
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                dosage: newItem?.dosage || "",
                labelClaim: newItem?.labelClaim || "",
                rutePemberian: newItem?.rutePemberian || "",
                aturanPakai: newItem?.aturanPakai || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_deskripsiProduct.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_deskripsiProduct.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "Data has been saved",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveFarmakologiKlinis(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      console.log(id, "<< id");
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      console.log(data, "< data");
      console.log(id, "<<<<<");

      const prevKomposisi = await t_farmakologiKlinis.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(prevKomposisi, "< prev");

      const existing = prevKomposisi.map((item) => item?.id);
      console.log(existing, "< exis");
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, " < new item");
          console.log(newItem?.id, " < new itemid");
          console.log(existing?.includes(+newItem?.id), " < existing");
          if (!newItem?.id) {
            console.log("masuk if");
            const created = await t_farmakologiKlinis.create(
              {
                indikasi: newItem?.indikasi || "",
                mekanismeAksi: newItem?.mekanismeAksi || "",
                efekSamping: newItem?.efekSamping || "",
                absorpsi: newItem?.absorpsi || "",
                distribusi: newItem?.distribusi || "",
                metabolisme: newItem?.metabolisme || "",
                eliminasi: newItem?.eliminasi || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log(newItem, "< new item");
            await t_farmakologiKlinis.update(
              {
                indikasi: newItem?.indikasi || "",
                mekanismeAksi: newItem?.mekanismeAksi || "",
                efekSamping: newItem?.efekSamping || "",
                absorpsi: newItem?.absorpsi || "",
                distribusi: newItem?.distribusi || "",
                metabolisme: newItem?.metabolisme || "",
                eliminasi: newItem?.eliminasi || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_farmakologiKlinis.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_farmakologiKlinis.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKarakteristikFisikaKimia(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_karakteristikFisikakimia.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });
      console.log(prevKomposisi, "< prev");

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_karakteristikFisikakimia.create(
              {
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                noBatch: newItem?.noBatch || "",
                het: newItem?.het || "",
                tanggalProduksi: newItem?.tanggalProduksi || "",
                tanggalKadarluarsa: newItem?.tanggalKadarluarsa || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                detailSediaan: newItem?.detailSediaan || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_karakteristikFisikakimia.update(
              {
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                noBatch: newItem?.noBatch || "",
                het: newItem?.het || "",
                tanggalProduksi: newItem?.tanggalProduksi || "",
                tanggalKadarluarsa: newItem?.tanggalKadarluarsa || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                detailSediaan: newItem?.detailSediaan || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_karakteristikFisikakimia.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_karakteristikFisikakimia.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  static async handleSaveFormula(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_formula.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_formula.create(
              {
                bahanTambahan: newItem?.bahanTambahan || "",
                kandungan: newItem?.kandungan || "",
                fungsi: newItem?.fungsi || "",
                prosesPembuatan: newItem?.prosesPembuatan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formula.update(
              {
                bahanTambahan: newItem?.bahanTambahan || "",
                kandungan: newItem?.kandungan || "",
                fungsi: newItem?.fungsi || "",
                prosesPembuatan: newItem?.prosesPembuatan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_formula.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formula.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveStabilita(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_stabilita.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_stabilita.create(
              {
                namaProduk: newItem?.namaProduk || "",
                kondisiPenyimpanan: newItem?.kondisiPenyimpanan || "",
                kondisiKhusus: newItem?.kondisiKhusus || "",
                hasilStudiStabilita: newItem?.hasilStudiStabilita || "",
                masaKadaluarsa: newItem?.masaKadaluarsa || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_stabilita.update(
              {
                namaProduk: newItem?.namaProduk || "",
                kondisiPenyimpanan: newItem?.kondisiPenyimpanan || "",
                kondisiKhusus: newItem?.kondisiKhusus || "",
                hasilStudiStabilita: newItem?.hasilStudiStabilita || "",
                masaKadaluarsa: newItem?.masaKadaluarsa || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_stabilita.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_stabilita.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveStudiPaten(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_studiPaten.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_studiPaten.create(
              {
                nomorPaten: newItem?.nomorPaten || "",
                judulPaten: newItem?.judulPaten || "",
                filingDate: newItem?.filingDate || "",
                expiredDate: newItem?.expiredDate || "",
                claimPaten: newItem?.claimPaten || "",
                infringePaten: newItem?.infringePaten || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_studiPaten.update(
              {
                nomorPaten: newItem?.nomorPaten || "",
                judulPaten: newItem?.judulPaten || "",
                filingDate: newItem?.filingDate || "",
                expiredDate: newItem?.expiredDate || "",
                claimPaten: newItem?.claimPaten || "",
                infringePaten: newItem?.infringePaten || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_studiPaten.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_studiPaten.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveUjiInkompatibilitas(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_ujiInkompatibilitas.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_ujiInkompatibilitas.create(
              {
                namaBahan: newItem?.namaBahan || "",
                kondisi1: newItem?.kondisi1 || "",
                kondisi2: newItem?.kondisi2 || "",
                kondisi3: newItem?.kondisi3 || "",
                detailUji: newItem?.detailUji || [],
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_ujiInkompatibilitas.update(
              {
                namaBahan: newItem?.namaBahan || "",
                kondisi1: newItem?.kondisi1 || "",
                kondisi2: newItem?.kondisi2 || "",
                kondisi3: newItem?.kondisi3 || "",
                detailUji: newItem?.detailUji || [],
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_ujiInkompatibilitas.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_ujiInkompatibilitas.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveCqa(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_cqa.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_cqa.create(
              {
                qttpElements: newItem?.qttpElements || "",
                target: newItem?.target || "",
                safety: newItem?.safety || "",
                efficacy: newItem?.efficacy || "",
                formulaDanProses: newItem?.formulaDanProses || "",
                apakahIniKritikalCqa: newItem?.apakahIniKritikalCqa || "",
                justifikasi: newItem?.justifikasi || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_cqa.update(
              {
                qttpElements: newItem?.qttpElements || "",
                target: newItem?.target || "",
                safety: newItem?.safety || "",
                efficacy: newItem?.efficacy || "",
                formulaDanProses: newItem?.formulaDanProses || "",
                apakahIniKritikalCqa: newItem?.apakahIniKritikalCqa || "",
                justifikasi: newItem?.justifikasi || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_cqa.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_cqa.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveFormulaProtokol(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_formulaProtokol.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_formulaProtokol.create(
              {
                komposisi: newItem?.komposisi || "",
                fungsi: newItem?.fungsi || "",
                apakahAdaPadaKomposisiOriginatorKompetitor:
                  newItem?.apakahAdaPadaKomposisiOriginatorKompetitor || "",
                justifikasi: newItem?.justifikasi || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaProtokol.update(
              {
                komposisi: newItem?.komposisi || "",
                fungsi: newItem?.fungsi || "",
                apakahAdaPadaKomposisiOriginatorKompetitor:
                  newItem?.apakahAdaPadaKomposisiOriginatorKompetitor || "",
                justifikasi: newItem?.justifikasi || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_formulaProtokol.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaProtokol.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveMappingProcess(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< Data map");

      const prevKomposisi = await t_mappingProcess.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_mappingProcess.create(
              {
                processParameters: newItem?.processParameters || "",
                materialAttributes: newItem?.materialAttributes || "",
                manufacturingProcess: newItem?.manufacturingProcess || "",
                qualityAttributes: newItem?.qualityAttributes || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_mappingProcess.update(
              {
                processParameters: newItem?.processParameters || "",
                materialAttributes: newItem?.materialAttributes || "",
                manufacturingProcess: newItem?.manufacturingProcess || "",
                qualityAttributes: newItem?.qualityAttributes || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_mappingProcess.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_mappingProcess.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveMaterial(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_material.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_material.create(
              {
                jumlahPenelitianAnalisaMaterial:
                  newItem?.jumlahPenelitianAnalisaMaterial || null,
                kebutuhanAnalisaMaterial:
                  newItem?.kebutuhanAnalisaMaterial || null,
                biayaAnalisaMaterial: newItem?.biayaAnalisaMaterial || null,
                jumlahPenelitianOrientasiFormulaDanProses:
                  newItem?.jumlahPenelitianOrientasiFormulaDanProses || null,
                kebutuhanOrientasiFormulaDanProses:
                  newItem?.kebutuhanOrientasiFormulaDanProses || null,
                biayaOrientasiFormulaDanProses:
                  newItem?.biayaOrientasiFormulaDanProses || null,
                jumlahPenelitianOptimasiFormulaDanProses:
                  newItem?.jumlahPenelitianOptimasiFormulaDanProses || null,
                kebutuhanOptimasiFormulaDanProses:
                  newItem?.kebutuhanOptimasiFormulaDanProses || null,
                biayaOptimasiFormulaDanProses:
                  newItem?.biayaOptimasiFormulaDanProses || null,
                jumlahPenelitianStabilitaSkalaLab:
                  newItem?.jumlahPenelitianStabilitaSkalaLab || null,
                kebutuhanStabilitaSkalaLab:
                  newItem?.kebutuhanStabilitaSkalaLab || null,
                biayaStabilitaSkalaLab: newItem?.biayaStabilitaSkalaLab || null,
                jumlahPenelitianSampelPerTinggal:
                  newItem?.jumlahPenelitianSampelPerTinggal || null,
                kebutuhanSampelPerTinggal:
                  newItem?.kebutuhanSampelPerTinggal || null,
                biayaSampelPerTinggal: newItem?.biayaSampelPerTinggal || null,
                totalKebutuhanMaterial: newItem?.totalKebutuhanMaterial || null,
                perkiraanHargaPembelianMaterial:
                  newItem?.perkiraanHargaPembelianMaterial || null,
                source: newItem?.source || null,
                tableIndex: newItem?.tableIndex || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_material.update(
              {
                jumlahPenelitianAnalisaMaterial:
                  newItem?.jumlahPenelitianAnalisaMaterial || null,
                kebutuhanAnalisaMaterial:
                  newItem?.kebutuhanAnalisaMaterial || null,
                biayaAnalisaMaterial: newItem?.biayaAnalisaMaterial || null,
                jumlahPenelitianOrientasiFormulaDanProses:
                  newItem?.jumlahPenelitianOrientasiFormulaDanProses || null,
                kebutuhanOrientasiFormulaDanProses:
                  newItem?.kebutuhanOrientasiFormulaDanProses || null,
                biayaOrientasiFormulaDanProses:
                  newItem?.biayaOrientasiFormulaDanProses || null,
                jumlahPenelitianOptimasiFormulaDanProses:
                  newItem?.jumlahPenelitianOptimasiFormulaDanProses || null,
                kebutuhanOptimasiFormulaDanProses:
                  newItem?.kebutuhanOptimasiFormulaDanProses || null,
                biayaOptimasiFormulaDanProses:
                  newItem?.biayaOptimasiFormulaDanProses || null,
                jumlahPenelitianStabilitaSkalaLab:
                  newItem?.jumlahPenelitianStabilitaSkalaLab || null,
                kebutuhanStabilitaSkalaLab:
                  newItem?.kebutuhanStabilitaSkalaLab || null,
                biayaStabilitaSkalaLab: newItem?.biayaStabilitaSkalaLab || null,
                jumlahPenelitianSampelPerTinggal:
                  newItem?.jumlahPenelitianSampelPerTinggal || null,
                kebutuhanSampelPerTinggal:
                  newItem?.kebutuhanSampelPerTinggal || null,
                biayaSampelPerTinggal: newItem?.biayaSampelPerTinggal || null,
                totalKebutuhanMaterial: newItem?.totalKebutuhanMaterial || null,
                perkiraanHargaPembelianMaterial:
                  newItem?.perkiraanHargaPembelianMaterial || null,
                source: newItem?.source || null,
                tableIndex: newItem?.tableIndex || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_material.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_material.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveOriginatorKompetitor(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_originatorAtauKompetitor.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_originatorAtauKompetitor.create(
              {
                originator: newItem?.originator || "",
                source: newItem?.source || "",
                harga: newItem?.harga || null,
                pemeriksaanFisikDanKimiaOriginator:
                  newItem?.pemeriksaanFisikDanKimiaOriginator || null,
                profilDisolusi: newItem?.profilDisolusi || null,
                stabilita: newItem?.stabilita || null,
                perkiraanHargaPembelianMaterial:
                  newItem?.perkiraanHargaPembelianMaterial || null,
                tableIndex: newItem?.tableIndex || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_originatorAtauKompetitor.update(
              {
                originator: newItem?.originator || "",
                source: newItem?.source || "",
                harga: newItem?.harga || null,
                pemeriksaanFisikDanKimiaOriginator:
                  newItem?.pemeriksaanFisikDanKimiaOriginator || null,
                profilDisolusi: newItem?.profilDisolusi || null,
                stabilita: newItem?.stabilita || null,
                perkiraanHargaPembelianMaterial:
                  newItem?.perkiraanHargaPembelianMaterial || null,
                tableIndex: newItem?.tableIndex || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_originatorAtauKompetitor.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_originatorAtauKompetitor.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKebutuhanPeralatan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_kebutuhanPeralatanDanMesin.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_kebutuhanPeralatanDanMesin.create(
              {
                peralatanDanMesin: newItem?.peralatanDanMesin || "",
                fungsi: newItem?.fungsi || "",
                kapasitas: newItem?.kapasitas || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_kebutuhanPeralatanDanMesin.update(
              {
                peralatanDanMesin: newItem?.peralatanDanMesin || "",
                fungsi: newItem?.fungsi || "",
                kapasitas: newItem?.kapasitas || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_kebutuhanPeralatanDanMesin.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kebutuhanPeralatanDanMesin.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveQtpp(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_qtpp.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_qtpp.create(
              {
                bentukSediaan: newItem?.bentukSediaan || "",
                targetBentukSediaan: newItem?.targetBentukSediaan || "",
                justifikasiBentukSediaan:
                  newItem?.justifikasiBentukSediaan || null,
                detailSediaan: newItem?.detailSediaan || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_qtpp.update(
              {
                bentukSediaan: newItem?.bentukSediaan || "",
                targetBentukSediaan: newItem?.targetBentukSediaan || "",
                justifikasiBentukSediaan:
                  newItem?.justifikasiBentukSediaan || null,
                detailSediaan: newItem?.detailSediaan || null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_qtpp.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_qtpp.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKemasan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_kemasan.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];
      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_kemasan.create(
              {
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                noBatch: newItem?.noBatch || "",
                tanggalProduksi: newItem?.tanggalProduksi || "",
                tanggalKadarluarsa: newItem?.tanggalKadarluarsa || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                detailSediaan: newItem?.detailSediaan || [],
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_kemasan.update(
              {
                namaProduk: newItem?.namaProduk || "",
                manufacturer: newItem?.manufacturer || "",
                noBatch: newItem?.noBatch || "",
                tanggalProduksi: newItem?.tanggalProduksi || "",
                tanggalKadarluarsa: newItem?.tanggalKadarluarsa || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                bentukSediaan: newItem?.bentukSediaan || "",
                detailSediaan: newItem?.detailSediaan || [],
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_kemasan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kemasan.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKarakteristikBahanAktif(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_karakteristikBahanAktif.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_karakteristikBahanAktif.create(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_karakteristikBahanAktif.update(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_karakteristikBahanAktif.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_karakteristikBahanAktif.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKarakteristikBahanTambahan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_karakteristikBahanTambahan.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_karakteristikBahanTambahan.create(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_karakteristikBahanTambahan.update(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_karakteristikBahanTambahan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_karakteristikBahanTambahan.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKarakteristikBahanKemasan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_karakteristikBahanKemasan.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_karakteristikBahanKemasan.create(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_karakteristikBahanKemasan.update(
              {
                namaBahan: newItem?.namaBahan || "",
                tableIndex: newItem?.tableIndex ?? null,
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                sumberPustaka: newItem?.sumberPustaka || "",
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_karakteristikBahanKemasan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_karakteristikBahanKemasan.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKemasanProtokol(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_kemasanProtokolSkalaLab.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_kemasanProtokolSkalaLab.create(
              {
                parameterBentukSediaan: newItem?.parameterBentukSediaan || "",
                samaDenganOriginatorAtauKompetitorBentukSediaan:
                  newItem?.samaDenganOriginatorAtauKompetitorBentukSediaan ||
                  "",
                justifikasiBentukSediaan:
                  newItem?.justifikasiBentukSediaan || "",
                detailSediaan: newItem?.detailSediaan || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_kemasanProtokolSkalaLab.update(
              {
                parameterBentukSediaan: newItem?.parameterBentukSediaan || "",
                samaDenganOriginatorAtauKompetitorBentukSediaan:
                  newItem?.samaDenganOriginatorAtauKompetitorBentukSediaan ||
                  "",
                justifikasiBentukSediaan:
                  newItem?.justifikasiBentukSediaan || "",
                detailSediaan: newItem?.detailSediaan || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_kemasanProtokolSkalaLab.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kemasanProtokolSkalaLab.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveZatAktif(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_zatAktif.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_zatAktif.create(
              {
                materialAttributes: newItem?.materialAttributes || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_zatAktif.update(
              {
                materialAttributes: newItem?.materialAttributes || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_zatAktif.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_zatAktif.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveBahanTambahan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_bahanTambahan.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_bahanTambahan.create(
              {
                bahanTambahan: newItem?.bahanTambahan || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_bahanTambahan.update(
              {
                bahanTambahan: newItem?.bahanTambahan || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_bahanTambahan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_bahanTambahan.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKemasanPrimer(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");
      console.log(data, "< DAT");

      const prevKomposisi = await t_kemasanPrimer.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      console.log(existing, " << exsting");
      console.log(newItemId, " << newItemId");
      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<< new item");
          if (!newItem?.id) {
            console.log("<< masuk");
            const created = await t_kemasanPrimer.create(
              {
                materialAttributes: newItem?.materialAttributes || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            console.log("<<edit");
            await t_kemasanPrimer.update(
              {
                materialAttributes: newItem?.materialAttributes || "",
                pengaruhKeCqa: newItem?.pengaruhKeCqa || "",
                apakahVariabelDapatDimodifikasi:
                  newItem?.apakahVariabelDapatDimodifikasi || "",
                apakahTermasukCma: newItem?.apakahTermasukCma || "",
                justifikasi: newItem?.justifikasi || "",
                tableIndex: newItem?.tableIndex ?? null,
                StudiPraformulasiID: +id || null,
                user_id,
                delegated_to,
              },
              { where: { id: +newItem?.id }, transaction }
            );
            return +newItem?.id;
          } else {
            return null;
          }
        })
      );
      const itemDelete = existing.filter(
        (itemId) => !newItemId?.includes(itemId)
      );
      if (itemDelete.length > 0) {
        await t_kemasanPrimer.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kemasanPrimer.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });
      console.log(newData, "< newData");

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  // handle post dan edit matrix perbandingan
  static async createMatrixPerbandingan(req, res, next) {
    try {
      const { spesifikasiHeaders, content, StudiPraformulasiID } = req.body;
      console.log(req.body, "< req");
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const createMatrixPerbandingan = await t_matrixPerbandingan.create({
        spesifikasiHeaders,
        content,
        StudiPraformulasiID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create matrix perbandingan",
        data: createMatrixPerbandingan,
      });
    } catch (err) {
      console.error(err, "< ERROR");
      next(err);
    }
  }
  static async updateMatrixPerbandingan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { spesifikasiHeaders, content } = req.body;

      const [updatedRowsCount] = await t_matrixPerbandingan.update(
        {
          spesifikasiHeaders: spesifikasiHeaders || "",
          content: content || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "matrix perbandingan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "matrix perbandingan not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async getMatrixPerbandingan(req, res) {
    const { id } = req.params;
    try {
      const matrixDetail = await t_matrixPerbandingan.findOne({
        where: { StudiPraformulasiID: id },
      });

      if (!matrixDetail || matrixDetail.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(matrixDetail, "<<");
      res.status(200).json(matrixDetail);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  ///////////////////////////////

  static async editStudiPraformulasi(req, res, next) {
    const { id } = req.params;
    try {
      const {
        nomor,
        tanggalPenyusunan,
        tanggalAddendum,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        kesimpulan,
      } = req.body;

      const obj = {};

      if (nomor) {
        obj.nomor = nomor;
      }

      if (tanggalPenyusunan) {
        obj.tanggalPenyusunan = tanggalPenyusunan;
      }
      if (tanggalAddendum) {
        obj.tanggalAddendum = tanggalAddendum;
      }

      if (namaProduk) {
        obj.namaProduk = namaProduk;
      }

      if (komposisi) {
        obj.komposisi = komposisi;
      }

      if (kemasan) {
        obj.kemasan = kemasan;
      }

      if (alasan) {
        obj.alasan = alasan;
      }

      if (tujuan) {
        obj.tujuan = tujuan;
      }

      if (productBriefNo) {
        obj.productBriefNo = productBriefNo;
      }

      if (kesimpulan) {
        obj.kesimpulan = kesimpulan;
      }

      const studi = await t_studiPraformulasi.findByPk(+id);

      const [updatedRowsCount] = await t_studiPraformulasi.update(
        {
          ...obj,
        },
        {
          where: { id: id },
        }
      );

      console.log(updatedRowsCount, "<<< updated");

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "studi pra updated successfully",
        });
      } else {
        res.status(404).json({
          message: "studi pra not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async getProductBrief(req, res) {
    try {
      const noProductBrief = await t_productBrief.findAll({
        attributes: [
          "id",
          "productBrief",
          "nama",
          "kode",
          "kemasan",
          "bahanAktifDanDosis",
          "rdSelection",
        ], // Replace 'columnName' with the actual name of the column you want
      });
      if (!noProductBrief) throw new MyError(400, "notFound!");

      res.status(200).json(noProductBrief);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateTujuan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { tujuan } = req.body;
      const findStudiPraformulasiID = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const updateTujuan = await t_studiPraformulasi.update(
        { tujuan: tujuan },
        {
          where: {
            id: findStudiPraformulasiID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateTujuan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateTujuanScreening(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { tujuanScreening } = req.body;
      const findStudi = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudi) throw { name: "NotFound" };
      const updateTujuanScreening = await t_studiPraformulasi.update(
        { tujuanScreening: tujuanScreening },
        {
          where: {
            id: findStudi.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateTujuanScreening);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateKesimpulanScreening(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { kesimpulanScreening } = req.body;
      const findStudi = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudi) throw { name: "NotFound" };
      const updateKesimpulanScreening = await t_studiPraformulasi.update(
        { kesimpulanScreening: kesimpulanScreening },
        {
          where: {
            id: findStudi.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateKesimpulanScreening);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateKesimpulan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { kesimpulan } = req.body;
      const findStudi = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudi) throw { name: "NotFound" };
      const updateKesimpulan = await t_studiPraformulasi.update(
        { kesimpulan: kesimpulan },
        {
          where: {
            id: findStudi.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateKesimpulan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateDokumenAcuan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { productBriefNo } = req.body;
      const findStudiPraformulasiID = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const updateDokumenAcuan = await t_studiPraformulasi.update(
        { productBriefNo: productBriefNo },
        {
          where: {
            id: findStudiPraformulasiID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateDokumenAcuan);
    } catch (err) {
      console.log(err);
    }
  }
  static async getStudiPraformulasiDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      const { id } = req.params;
      let studi;
      console.log(studi, "<< STUDI");
      console.log(joblevel_id_user, "<< job");

      if (+joblevel_id_user || bagian_user === bagian_user) {
        studi = await t_studiPraformulasi.findOne({
          where: {
            id,
          },
          include: { model: t_studiPraformulasi_status, as: "approver_data" },
          order: [
            [
              { model: t_studiPraformulasi_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
        console.log(studi, "<<studi");
      } else {
        console.log("xixi");
        studi = await t_studiPraformulasi.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_studiPraformulasi_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_studiPraformulasi_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }
      console.log(studi.dataValues, "<< studidetails");
      // const apprApplicationCode = studi.apprAplicationCode;
      // console.log(apprApplicationCode, "<< code");
      // const apprDeptId = studi.bagian;
      // console.log(apprDeptId, "<< BAGIAN");
      // const apprNo = await checkStatusStudi(id);
      // console.log(a);

      studi.dataValues.approver_inisial_1 = await fetchApproverInisial({
        user_id: studi.dataValues.approver_user_id_1,
        delegated_to: studi.dataValues.approver_delegated_to_1,
      });
      studi.dataValues.approver_inisial_2 = await fetchApproverInisial({
        user_id: studi.dataValues.approver_user_id_2,
        delegated_to: studi.dataValues.approver_delegated_to_2,
      });

      console.log(
        studi.dataValues.approver_user_id_1,
        studi.dataValues.approver_delegated_to_1,
        "<< 123"
      );
      console.log(studi, "< STUDI");
      // await Promise.all(
      //   studi.dataValues.approver_data.map(async (el, index) => {
      //     el.dataValues.approver_inisial = await fetchApproverInisial({
      //       user_id: el.user_id,
      //       delegated_to: el.delegated_to,
      //     });

      //     return el;
      //   })
      // );

      const apprDeptId = studi?.dataValues?.rdSelection;
      console.log(apprDeptId, "<DEBTID");
      const apprNo = await checkStatusStudi(id);
      console.log(apprNo, "<< apprNo");

      await Promise.all(
        studi.dataValues.approver_data.map(async (el, index) => {
          el.dataValues.approver_inisial = await fetchApproverInisial({
            user_id: el.user_id,
            delegated_to: el.delegated_to,
          });

          return el;
        })
      );

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "studiPraformulasi",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );
      console.log(isApprove, "<< asdasda");
      if (isApprove.message) throw new MyError(400, isApprove.message);

      if (studi) {
        res.status(200).json({ ...studi?.toJSON(), isApprove });
      } else {
        res.status(200).json();
      }
    } catch (error) {
      next(error);
    }
  }
  static async getDeskripsiProductDetails(req, res) {
    const { id } = req.params;
    try {
      const desDetails = await t_deskripsiProduct.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!desDetails || desDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(desDetails, "<<");
      res.status(200).json(desDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getFarmakologiKlinisDetails(req, res) {
    const { id } = req.params;
    try {
      const farmakologiDetail = await t_farmakologiKlinis.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!farmakologiDetail || farmakologiDetail.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(farmakologiDetail, "<<");
      res.status(200).json(farmakologiDetail);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getFormulaDetails(req, res) {
    const { id } = req.params;
    try {
      const formulaDetail = await t_formula.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!formulaDetail || formulaDetail.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(formulaDetail);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getStabilitaDetails(req, res) {
    const { id } = req.params;
    try {
      const stabilitaDetails = await t_stabilita.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!stabilitaDetails || stabilitaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(stabilitaDetails, "<<");
      res.status(200).json(stabilitaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getUjiKompatibilitas(req, res) {
    const { id } = req.params;
    try {
      const ujiDetails = await t_ujiInkompatibilitas.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!ujiDetails || ujiDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(stabilitaDetails, "<<");
      res.status(200).json(ujiDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getKemasanDetails(req, res) {
    const { id } = req.params;
    try {
      const kemasanDetails = await t_kemasan.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!kemasanDetails || kemasanDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(kemasanDetails, "<<");
      res.status(200).json(kemasanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getKarakteristikFisikaKimia(req, res) {
    const { id } = req.params;
    try {
      const fisikaKimiaDetails = await t_karakteristikFisikakimia.findAll({
        where: { StudiPraformulasiID: id },
      });

      console.log(fisikaKimiaDetails, "<<");
      if (!fisikaKimiaDetails || fisikaKimiaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }
      res.status(200).json(fisikaKimiaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getQtpp(req, res) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const qtpp = await t_qtpp.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(qtpp);
    } catch (err) {
      console.error(err, 333333333333);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getCqa(req, res) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const cqaDetails = await t_cqa.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(cqaDetails, "<< cqa details");

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(cqaDetails);
    } catch (err) {
      console.error(err, 333333333333);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getFormulaProtokol(req, res) {
    const { id } = req.params;
    try {
      const formulaDetails = await t_formulaProtokol.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!formulaDetails || formulaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(formulaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async createProsesPembuatan(req, res, next) {
    try {
      const { prosesPembuatan, StudiPraformulasiID } = req.body;
      console.log(req.body, "<< body");
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(req.body, "< bod");
      const createProsesPembuatan = await t_prosesPembuatan.create({
        prosesPembuatan: prosesPembuatan,
        StudiPraformulasiID: StudiPraformulasiID,
        user_id,
        delegated_to,
      });

      console.log(createProsesPembuatan, " <<<<< <<prop");

      res.status(201).json({
        message: "Success Create ProsesPembuatan",
        data: createProsesPembuatan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getProsesPembuatan(req, res) {
    const { id } = req.params;
    try {
      const pembuatanDetails = await t_prosesPembuatan.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!pembuatanDetails || pembuatanDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(pembuatanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editProsesPembuatan(req, res, next) {
    try {
      const { id } = req.params;
      console.log(id, "< id");

      const { prosesPembuatan } = req.body;
      if (!prosesPembuatan) {
        return res
          .status(400)
          .json({ error: "Field 'prosesPembuatan' is required." });
      }

      const updateProsesPembuatan = await t_prosesPembuatan.update(
        { prosesPembuatan },
        { where: { StudiPraformulasiID: +id } }
      );

      res.status(200).json(updateProsesPembuatan);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getMappingProcess(req, res) {
    const { id } = req.params;
    try {
      const mappingDetails = await t_mappingProcess.findAll({
        where: { StudiPraformulasiID: +id },
        order: [["createdAt", "ASC"]], // Order by createdAt descending
      });

      // if (!mappingDetails || mappingDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(mappingDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async createRencanaAktivitas(req, res, next) {
    try {
      const {
        tersediaBahanAwal,
        optimasiFormulaDanProses,
        stabilitaSkalaLab,
        StudiPraformulasiID,
      } = req.body;

      const createRencanaAktivitas = await t_rencanaAktivitas.create({
        tersediaBahanAwal,
        optimasiFormulaDanProses,
        stabilitaSkalaLab,
        StudiPraformulasiID: +StudiPraformulasiID,
      });

      console.log(createRencanaAktivitas, "< rencana");

      res.status(201).json({
        message: "Success Create rencana aktivitas",
        data: createRencanaAktivitas,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getRencanaAktivitas(req, res) {
    const { id } = req.params;
    try {
      const rencanaDetails = await t_rencanaAktivitas.findAll({
        where: { StudiPraformulasiID: id },
      });

      console.log(rencanaDetails, "<< 12312321");

      // if (!rencanaDetails || rencanaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(rencanaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editRencanaAktivitas(req, res, next) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const { tersediaBahanAwal, optimasiFormulaDanProses, stabilitaSkalaLab } =
        req.body;

      const [updatedRowsCount] = await t_rencanaAktivitas.update(
        {
          tersediaBahanAwal,
          optimasiFormulaDanProses,
          stabilitaSkalaLab,
        },
        {
          where: { StudiPraformulasiID: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "rencana aktivitas updated successfully",
        });
      } else {
        res.status(404).json({
          message: "rencana aktivitas not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async getMaterial(req, res) {
    const { id } = req.params;
    try {
      const materialDetails = await t_material.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!materialDetails || materialDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(materialDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getOriginatorKompetitor(req, res) {
    const { id } = req.params;
    try {
      const originatorDetails = await t_originatorAtauKompetitor.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!originatorDetails || originatorDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(originatorDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  static async getKebutuhanPeralatan(req, res) {
    const { id } = req.params;
    try {
      const kebutuhanDetails = await t_kebutuhanPeralatanDanMesin.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!kebutuhanDetails || kebutuhanDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(kebutuhanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  //
  static async createKemasanSkalaLab(req, res, next) {
    try {
      const {
        parameterBentukSediaan,
        samaDenganOriginatorAtauKompetitorBentukSediaan,
        justifikasiBentukSediaan,
        detailSediaan,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;

      const createKemasan = await t_kemasanProtokolSkalaLab.create({
        parameterBentukSediaan: parameterBentukSediaan,
        samaDenganOriginatorAtauKompetitorBentukSediaan:
          samaDenganOriginatorAtauKompetitorBentukSediaan,
        justifikasiBentukSediaan: justifikasiBentukSediaan,
        detailSediaan: detailSediaan,
        tableIndex: +tableIndex,
        StudiPraformulasiID: StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create kemasan skala lab",
        data: createKemasan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getKemasanProtokol(req, res) {
    const { id } = req.params;
    try {
      const kemasanProtokolDetails = await t_kemasanProtokolSkalaLab.findAll({
        where: { StudiPraformulasiID: +id },
        order: [["createdAt", "ASC"]], // Order by createdAt descending
      });

      // if (!kemasanProtokolDetails || kemasanProtokolDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(kemasanProtokolDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editKemasanProtokol(req, res, next) {
    try {
      const { id } = req.params;
      console.log(id, "<< ID");
      const {
        parameterBentukSediaan,
        samaDenganOriginatorAtauKompetitorBentukSediaan,
        justifikasiBentukSediaan,
        detailSediaan,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;

      const createKemasan = await t_kemasanProtokolSkalaLab.update(
        {
          parameterBentukSediaan: parameterBentukSediaan,
          samaDenganOriginatorAtauKompetitorBentukSediaan:
            samaDenganOriginatorAtauKompetitorBentukSediaan,
          justifikasiBentukSediaan: justifikasiBentukSediaan,
          detailSediaan: detailSediaan,
          tableIndex: +tableIndex,
          StudiPraformulasiID: StudiPraformulasiID,
        },
        {
          where: {
            id: id,
          },
          returning: true,
        }
      );

      res.status(201).json({
        message: "Success Create kemasan skala lab",
        data: createKemasan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async createZatAktif(req, res, next) {
    try {
      const {
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;
      const createZatAktif = await t_zatAktif.create({
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        StudiPraformulasiID,
      });
      res.status(201).json({
        message: "Success Create ZatAktif",
        data: createZatAktif,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createBahanTambahan(req, res, next) {
    try {
      const {
        bahanTambahan,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;
      const createBahanTambahan = await t_bahanTambahan.create({
        bahanTambahan,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        StudiPraformulasiID,
      });
      res.status(201).json({
        message: "Success Create bahan tambahan",
        data: createBahanTambahan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKemasanPrimer(req, res, next) {
    try {
      const {
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;
      const createKemasanPrimer = await t_kemasanPrimer.create({
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        StudiPraformulasiID,
      });
      res.status(201).json({
        message: "Success Create kemasan primer",
        data: createKemasanPrimer,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getZatAktif(req, res) {
    const { id } = req.params;
    try {
      const zatAktifDetails = await t_zatAktif.findAll({
        where: { StudiPraformulasiID: +id },
      });

      // if (!zatAktifDetails || zatAktifDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(zatAktifDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getBahanTambahan(req, res) {
    const { id } = req.params;
    try {
      const bahanTambahanDetails = await t_bahanTambahan.findAll({
        where: { StudiPraformulasiID: +id },
      });

      // if (!bahanTambahanDetails || bahanTambahanDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(bahanTambahanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getKemasanPrimer(req, res) {
    const { id } = req.params;
    try {
      const kemasanPrimerDetails = await t_kemasanPrimer.findAll({
        where: { StudiPraformulasiID: +id },
      });

      // if (!kemasanPrimerDetails || kemasanPrimerDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(kemasanPrimerDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editZatAktif(req, res, next) {
    const { id } = req.params;
    console.log(id, "IASDIASIDSAIDA");
    try {
      const {
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await t_zatAktif.update(
        {
          materialAttributes,
          pengaruhKeCqa,
          apakahVariabelDapatDimodifikasi,
          apakahTermasukCma,
          justifikasi,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "zatAktif updated successfully",
        });
      } else {
        res.status(404).json({
          message: "zatAktif not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editKemasanPrimer(req, res, next) {
    const { id } = req.params;
    console.log(id, "IASDIASIDSAIDA");
    try {
      const {
        materialAttributes,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await t_kemasanPrimer.update(
        {
          materialAttributes,
          pengaruhKeCqa,
          apakahVariabelDapatDimodifikasi,
          apakahTermasukCma,
          justifikasi,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "kemasan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "kemasan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editBahanTambahan(req, res, next) {
    console.log("ziziiziziziziz");
    const { id } = req.params;
    console.log(id, "IASDIASIDSAIDA");
    res.send();
    try {
      const {
        bahanTambahan,
        pengaruhKeCqa,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await BahanTambahan.update(
        {
          bahanTambahan,
          pengaruhKeCqa,
          apakahVariabelDapatDimodifikasi,
          apakahTermasukCma,
          justifikasi,
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "bahan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "bahan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  //
  static async createCpp(req, res, next) {
    try {
      const {
        parameterProcess,
        pengaruhKeCqa,
        apakahTermasukCpp,
        justifikasi,
        StudiPraformulasiID,
      } = req.body;

      const createCpp = await t_cpp.create({
        parameterProcess,
        pengaruhKeCqa,
        apakahTermasukCpp,
        justifikasi,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Cpp",
        data: createCpp,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getCpp(req, res) {
    const { id } = req.params;
    try {
      const cppDetails = await t_cpp.findAll({
        where: { StudiPraformulasiID: id },
      });

      // if (!cppDetails || cppDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(cppDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async editCppDetails(req, res, next) {
    const { id } = req.params;
    try {
      const {
        parameterProcess,
        pengaruhKeCqa,
        apakahTermasukCpp,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await t_cpp.update(
        {
          parameterProcess,
          pengaruhKeCqa,
          apakahTermasukCpp,
          justifikasi,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "cpp updated successfully",
        });
      } else {
        res.status(404).json({
          message: "cpp not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiPraformulasi;
