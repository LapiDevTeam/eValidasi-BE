const {
  t_kelengkapanDokumen,
  t_produkTerdampak,
  t_proposalDiversifikasi,
  t_persentaseDalamFormula,
  t_proposalDiversifikasi_status,
  sequelize,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusCatatanTrial } = require("../helpers/checkStatus");
const { getStatusCatatanTrial } = require("../helpers/statusCatatanTrial");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");
const { fetchApproverInisial } = require("../services/mssqlService");
const t_kelengkapandokumen = require("../models/t_kelengkapandokumen");

class ControllerProposalDiversifikasi {
  static async getProposalDiversifikasiDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      const { id } = req.params;

      //   let proposalDiversifikasiDetails;
      //   if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
      //     console.log(id, "<< id");
      //     proposalDiversifikasiDetails = await t_proposalDiversifikasi?.findOne({
      //       where: {
      //         id,
      //       },
      //       include: {
      //         model: t_proposalDiversifikasi_status,
      //         as: "approver_data",
      //       },
      //       order: [
      //         [
      //           { model: t_proposalDiversifikasi_status, as: "approver_data" },
      //           "approver_no",
      //           "ASC",
      //         ],
      //       ],
      //     });
      //     console.log(proposalDiversifikasiDetails, "<< detil");
      //   } else {
      //     console.log("test");
      //     proposalDiversifikasiDetails = await t_proposalDiversifikasi.findOne({
      //       where: {
      //         id,
      //         bagian: bagian_user,
      //       },
      //       include: {
      //         model: t_proposalDiversifikasi_status,
      //         as: "approver_data",
      //       },
      //       order: [
      //         [
      //           { model: t_proposalDiversifikasi_status, as: "approver_data" },
      //           "approver_no",
      //           "ASC",
      //         ],
      //       ],
      //     });
      //   }
      //   console.log(proposalDiversifikasiDetails, "<<< DETAILS");
      //   // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      //   const apprDeptId = proposalDiversifikasiDetails.bagian;
      //   const apprNo = await checkStatusLaporanTrialSkalaLab(id);
      //   console.log(apprNo, "< < DEBt ID");
      //   const isApprove = await isApproveValidation(
      //     // productBriefDetail.nama_pegawai,
      //     "laporanTrialSkalaLab",
      //     apprDeptId,
      //     apprNo,
      //     user_id
      //     // nama_user
      //   );
      //   console.log(isApprove, "<< asdasda");
      //   if (isApprove.message) throw new MyError(400, isApprove.message);

      const proposalDiversifikasi = await t_proposalDiversifikasi.findOne({
        where: {
          id: +id,
        },
      });
      const kelengkapanDokumen = await t_kelengkapanDokumen.findAll({
        where: {
          ProposalDiversifikasiID: +id,
        },
      });
      const produkTerdampak = await t_produkTerdampak.findAll({
        where: {
          ProposalDiversifikasiID: +id,
        },
      });
      const persentaseDalamFormula = await t_persentaseDalamFormula.findAll({
        where: {
          ProposalDiversifikasiID: +id,
        },
      });

      res.status(200).json({
        proposalDiversifikasi,
        kelengkapanDokumen,
        produkTerdampak,
        persentaseDalamFormula,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
  static async createProposalDiversifikasi(req, res, next) {
    const { user_id, delegated_to, nama_user, joblevel_id_user, inisial_user } =
      req.user;
    try {
      const { namaBahanBaku, produsen, pemasok } = req.body;

      //   const existingProposalDiversifikasi =
      //     await t_proposalDiversifikasi.findOne({
      //       where: {
      //         productBrief: productBrief,
      //       },
      //       order: [["createdAt", "DESC"]],
      //     });

      //   if (!productBrief) {
      //     throw new MyError(400, "Product Brief is required !");
      //   } else if (!kode) {
      //     throw new MyError(400, "Kode is required !");
      //   } else if (!nama) {
      //     throw new MyError(400, "Nama is require !");
      //   } else if (!kemasan) {
      //     throw new MyError(400, "Kemasan is required !");
      //   } else if (!bentukSediaan) {
      //     throw new MyError(400, "Bentuk Sediaan is required !");
      //   } else if (!ruangLingkup) {
      //     throw new MyError(400, "Ruang Lingkup is required !");
      //   } else if (!bahanAktifDanDosis || bahanAktifDanDosis.length === 0) {
      //     throw new MyError(
      //       400,
      //       "At least one bahanAktifDanDosis is be provided"
      //     );
      //   }

      const createProposalDiversifikasi = await t_proposalDiversifikasi.create({
        namaBahanBaku: namaBahanBaku,
        produsen: produsen,
        pemasok: pemasok,
        user_id,
        delegated_to,
      });

      //       const info = await transporter.sendMail({
      //         from: `[Notifikasi][Product Brief] - ${nama} <no_reply_it@lapilabs.co.id>`,
      //         to: ["gunardi.cahyadi@lapilabs.co.id", "cahyadigunardi@gmail.com"], // list of receivers
      //         subject: "Product Brief", // Subject line
      //         text: "Hellow world?", // plain text body
      //         html: `<b>
      //         <html>
      //         <p> Dear Bapak / Ibu di tempat,</p>
      //  <p> Bersamaan dengan email ini, diberitahukan bahwa Produk Brief “${nama}” dengan nomor: ${kode} telah diterima, mohon agar masing-masing bagian dapat melakukan kajian produk baru tersebut.</p>
      //  <br>
      // </p>Demikian disampaikan, terima kasih atas perhatian dan kerjasamanya. </p>
      // </p>eFormulation System </p>
      //         </html>
      //         </b>`,
      //       });

      res.status(201).json({
        message: "Data has been saved",
        data: createProposalDiversifikasi,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  static async findAllProposalDiversifikasi(req, res) {
    try {
      const { page, namaProduk, produsen, pemasok, statusDokumen } = req.query;

      const size = page ? 7 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (produsen) searchParams.produsen = { [Op.iLike]: `%${produsen}%` };
      if (pemasok) searchParams.pemasok = { [Op.iLike]: `%${pemasok}%` };
      if (statusDokumen)
        searchParams.statusDokumen = { [Op.iLike]: `%${statusDokumen}%` };

      const proposal = await t_proposalDiversifikasi.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(proposal.count / limit) : "",
        proposal,
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async handleSaveKelengkapanDokumen(req, res) {
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

      //   const cat = await t_catatanTrial.findByPk(+id);
      //   if (cat?.statusDokumen === "Reject") {
      //     await t_catatanTrial_status.destroy({
      //       where: { CatatanTrialID: +id },
      //     });
      //     await t_catatanTrial.update(
      //       {
      //         is_approve_1: "",
      //         approver_name_1: "",
      //         approver_user_id_1: "",
      //         approver_delegated_to_1: "",
      //         approver_tanggal_1: null,
      //         keterangan_reject_1: "",
      //         statusDokumen: "Draft",
      //       },
      //       {
      //         where: {
      //           id,
      //         },
      //       }
      //     );
      //   }

      const prevKelengkapanDokumen = await t_kelengkapanDokumen.findAll({
        where: {
          ProposalDiversifikasiID: +id,
        },
      });

      const existing = prevKelengkapanDokumen.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_kelengkapanDokumen.create(
              {
                dokumen: newItem?.dokumen || "",
                kelengkapan: newItem?.kelengkapan || "",
                upload: newItem?.upload || "",
                ProposalDiversifikasiID: +newItem?.id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_kelengkapanDokumen.update(
              {
                dokumen: newItem?.dokumen || "",
                kelengkapan: newItem?.kelengkapan || "",
                upload: newItem?.upload || "",
                ProposalDiversifikasiID: +id || null,
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
        await t_kelengkapanDokumen.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kelengkapanDokumen.findAll({
        where: {
          ProposalDiversifikasiID: +id,
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
  static async handleSaveProdukTerdampak(req, res) {
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

      //   const cat = await t_catatanTrial.findByPk(+id);
      //   if (cat?.statusDokumen === "Reject") {
      //     await t_catatanTrial_status.destroy({
      //       where: { CatatanTrialID: +id },
      //     });
      //     await t_catatanTrial.update(
      //       {
      //         is_approve_1: "",
      //         approver_name_1: "",
      //         approver_user_id_1: "",
      //         approver_delegated_to_1: "",
      //         approver_tanggal_1: null,
      //         keterangan_reject_1: "",
      //         statusDokumen: "Draft",
      //       },
      //       {
      //         where: {
      //           id,
      //         },
      //       }
      //     );
      //   }

      const prevProdukTerdampak = await t_produkTerdampak.findAll({
        where: {
          ProposalDiversifikasiID: +id,
        },
      });

      const existing = prevProdukTerdampak.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_produkTerdampak.create(
              {
                namaProduk: newItem?.namaProduk || "",
                keterangan: newItem?.keterangan || "",
                ProposalDiversifikasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_produkTerdampak.update(
              {
                namaProduk: newItem?.namaProduk || "",
                keterangan: newItem?.keterangan || "",
                ProposalDiversifikasiID: +id || null,
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
        await t_produkTerdampak.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_produkTerdampak.findAll({
        where: {
          ProposalDiversifikasiID: +id,
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
  static async handleSavePersentaseDalamFormula(req, res) {
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

      //   const cat = await t_catatanTrial.findByPk(+id);
      //   if (cat?.statusDokumen === "Reject") {
      //     await t_catatanTrial_status.destroy({
      //       where: { CatatanTrialID: +id },
      //     });
      //     await t_catatanTrial.update(
      //       {
      //         is_approve_1: "",
      //         approver_name_1: "",
      //         approver_user_id_1: "",
      //         approver_delegated_to_1: "",
      //         approver_tanggal_1: null,
      //         keterangan_reject_1: "",
      //         statusDokumen: "Draft",
      //       },
      //       {
      //         where: {
      //           id,
      //         },
      //       }
      //     );
      //   }

      const prevPersentaseDalamFormula = await t_persentaseDalamFormula.findAll(
        {
          where: {
            ProposalDiversifikasiID: +id,
          },
        }
      );

      const existing = prevPersentaseDalamFormula.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_persentaseDalamFormula.create(
              {
                namaProduk: newItem?.namaProduk || "",
                persenDalamFormula: newItem?.persenDalamFormula || "",
                skorA: newItem?.skorA || "",
                bobotB: newItem?.bobotB || "",
                jumlah: newItem?.jumlah || "",
                ProposalDiversifikasiID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_persentaseDalamFormula.update(
              {
                namaProduk: newItem?.namaProduk || "",
                persenDalamFormula: newItem?.persenDalamFormula || "",
                skorA: newItem?.skorA || "",
                bobotB: newItem?.bobotB || "",
                jumlah: newItem?.jumlah || "",
                ProposalDiversifikasiID: +id || null,
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
        await t_persentaseDalamFormula.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_persentaseDalamFormula.findAll({
        where: {
          ProposalDiversifikasiID: +id,
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
}

module.exports = ControllerProposalDiversifikasi;
