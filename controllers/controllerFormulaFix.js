const {
  t_formulaFix,
  t_formulaFix_status,
  t_perhitunganBahanBakuFormulaFix,
  t_kemasanFormulaFix,
  t_formulaFix_prosesPengolahan,
  t_formulaFix_prosesPengemasan,
  t_formulaFix_rancanganSpesifikasiObatJadi,
  t_formulaFix_dataStabilitas,
  t_formulaFix_acuanCatatanTrial,
  sequelize,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op, where } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusFormulaFix } = require("../helpers/checkStatus");
const { getStatusFormulaFix } = require("../helpers/statusFormulaFix");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");

class ControllerFormulaFix {
  static async createFormulaFix(req, res, next) {
    try {
      const { nama_user, bagian_user } = req.user;

      const {
        namaProduk,
        filter,
        komposisi,
        kemasan,
        formulaAcuan,
        bentukSediaan,
        besarBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
      } = req.body;

      console.log(kemasan, "< kemasan");

      const createFormulaFix = await t_formulaFix.create({
        namaProduk: namaProduk || "",
        filter: filter || "",
        komposisi: komposisi || "",
        kemasan: kemasan || "",
        formulaAcuan: formulaAcuan || "",
        bentukSediaan: bentukSediaan || "",
        besarBets: besarBets || "",
        revisi: revisi || "",
        alasan: alasan || "",
        filter: filter || "",
        formulaA: formulaA || "",
        formulaB: formulaB || "",
        formulaC: formulaC || "",
        pic: nama_user || "",
        bagian: bagian_user || "",
      });
      console.log(createFormulaFix, "<< created");

      res.status(201).json({
        message: "Success Create formulaFix",
        data: createFormulaFix,
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  static async findAllFormulaFix(req, res) {
    try {
      const {
        page,
        namaProduk,
        filter,
        komposisi,
        bentukSediaan,
        nomorBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (filter) searchParams.filter = { [Op.iLike]: `%${filter}%` };
      if (komposisi) searchParams.komposisi = { [Op.iLike]: `%${komposisi}%` };
      if (bentukSediaan)
        searchParams.bentukSediaan = { [Op.iLike]: `%${bentukSediaan}%` };
      if (nomorBets) searchParams.nomorBets = +nomorBets;
      if (revisi)
        searchParams.revisi = {
          [Op.iLike]: `%${revisi}%`,
        };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };
      if (formulaA)
        searchParams.formulaA = {
          [Op.iLike]: `%${formulaA}%`,
        };
      if (formulaB)
        searchParams.formulaB = {
          [Op.iLike]: `%${formulaB}%`,
        };
      if (formulaC)
        searchParams.formulaC = {
          [Op.iLike]: `%${formulaC}%`,
        };

      const formula = await t_formulaFix.findAndCountAll({
        where: searchParams,
        ...(size && { limit }),
        ...(size && { offset }),
        order: [["id", "DESC"]],
      });

      res.status(200).json({
        limitData: size ? limit : "",
        Offset: size ? offset : "",
        totalPage: size ? Math.ceil(formula.count / limit) : "",
        formula,
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async getFormulaFixDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;

      const { id } = req.params;

      let formulaFixDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        formulaFixDetails = await t_formulaFix?.findOne({
          where: {
            id,
          },
          include: { model: t_formulaFix_status, as: "approver_data" },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      } else {
        formulaFixDetails = await t_formulaFix.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_formulaFix_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_formulaFix_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      const apprDeptId = formulaFixDetails.bagian;
      const apprNo = await checkStatusFormulaFix(id);

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "formulaFix",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );

      if (isApprove.message) throw new MyError(400, isApprove.message);

      res
        .status(200)
        .json({ ...(formulaFixDetails?.dataValues || {}), isApprove });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async updateFormulaFix(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const {
        namaProduk,
        filter,
        komposisi,
        kemasan,
        formulaAcuan,
        bentukSediaan,
        besarBets,
        revisi,
        alasan,
        formulaA,
        formulaB,
        formulaC,
      } = req.body;

      console.log(req.body, "< req");

      const [updatedRowsCount] = await t_formulaFix.update(
        {
          namaProduk: namaProduk || "",
          filter: filter || "",
          komposisi: komposisi || "",
          kemasan: kemasan || "",
          formulaAcuan: formulaAcuan || "",
          bentukSediaan: bentukSediaan || "",
          besarBets: besarBets || "",
          revisi: revisi || "",
          alasan: alasan || "",
          filter: filter || "",
          formulaA: formulaA || "",
          formulaB: formulaB || "",
          formulaC: formulaC || "",
        },
        {
          where: { id: id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Formula Fix updated successfully",
        });
      } else {
        res.status(404).json({
          message: "Formula Fix not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async approveFormulaFix(req, res, next) {
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
      const findFormulaFix = await t_formulaFix.findByPk(+id);
      if (!findFormulaFix)
        throw new MyError(404, "Form formula fix tidak ditemukan");
      const apprNo = await checkStatusFormulaFix(id);

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "formulaFix",
        findFormulaFix.bagian,
        apprNo,
        user_id,
        nama_user
      );
      if (dataApprove.message) throw new MyError(400, dataApprove.message);
      let status;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        status = getStatusFormulaFix(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) status = "Closed";
      if (is_approve === false) {
        status = "Reject";
        await t_formulaFix_status.destroy({
          where: { FormulaFixID: +id },
        });
      }

      await t_formulaFix_status.create({
        FormulaFixID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_formulaFix.update(
        {
          status: status,
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

  static async getFormulaDetails(req, res, next) {
    try {
      const { id } = req.params;

      const formulaFix = await t_formulaFix.findOne({
        where: {
          id,
        },
      });
      const perhitunganBahanBaku =
        await t_perhitunganBahanBakuFormulaFix.findAll({
          where: { FormulaFixID: id },
          order: [["id", "ASC"]],
        });

      const kemasanFormula = await t_kemasanFormulaFix.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });

      const kemasanFormulaFixGrouped = kemasanFormula.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const kemasanFormulaFix = Object.values(kemasanFormulaFixGrouped);

      const prosesPengolahan = await t_formulaFix_prosesPengolahan.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });
      const prosesPengemasan = await t_formulaFix_prosesPengemasan.findAll({
        where: { FormulaFixID: id },
        order: [["id", "ASC"]],
      });
      const rancanganSpesifikasiObatJadi =
        await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
          where: { FormulaFixID: id },
          order: [["id", "ASC"]],
        });

      res.status(200).json({
        formulaFix,
        perhitunganBahanBaku,
        kemasanFormulaFix,
        prosesPengolahan,
        prosesPengemasan,
        rancanganSpesifikasiObatJadi,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async handleSavePerhitunganBahanBaku(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;
      console.log(data, "<dat");
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      console.log(id, "< IDDDDD");
      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { CatatanTrialID: +id },
      //   });
      //   await t_catatanTrial.update(
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

      const prevPerhitungan = await t_perhitunganBahanBakuFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevPerhitungan?.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id)?.map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<new");
          console.log(id, "< ID");

          if (!newItem?.id) {
            const created = await t_perhitunganBahanBakuFormulaFix.create(
              {
                title: newItem?.title || "",
                headers: newItem?.headers || null,
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_perhitunganBahanBakuFormulaFix.update(
              {
                title: newItem?.title || "",
                headers: newItem?.headers || null,
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
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
        await t_perhitunganBahanBakuFormulaFix.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_perhitunganBahanBakuFormulaFix.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_perhitunganBahanBakuFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveKemasanFormulaFix(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const flag_update = "UPDATE FOR DELETE";
      const { id } = req.params;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const formula = await t_formulaFix.findByPk(+id);

      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { CatatanTrialID: +id },
      //   });
      //   await t_catatanTrial.update(
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

      const prevKemasan = await t_kemasanFormulaFix.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKemasan.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_kemasanFormulaFix.create(
              {
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                tableIndex: newItem?.tableIndex ?? null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_kemasanFormulaFix.update(
              {
                parameter: newItem?.parameter || "",
                hasilTinjauan: newItem?.hasilTinjauan || "",
                tableIndex: newItem?.tableIndex ?? null,
                FormulaFixID: +id || null,
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
        await t_kemasanFormulaFix.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_kemasanFormulaFix.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_kemasanFormulaFix.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
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
  static async handleSaveProsesPengolahan(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;
      console.log(data, "<dat");
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      console.log(req.user, "<req");
      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { CatatanTrialID: +id },
      //   });
      //   await t_catatanTrial.update(
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

      const prevProsesPengolahan = await t_formulaFix_prosesPengolahan.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevProsesPengolahan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<new");
          console.log(id, "< ID");

          if (!newItem?.id) {
            const created = await t_formulaFix_prosesPengolahan.create(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_prosesPengolahan.update(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
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
        await t_formulaFix_prosesPengolahan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_prosesPengolahan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_prosesPengolahan.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveProsesPengemasan(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { data } = req.body;
      console.log(data, "<dat");
      const { id } = req.params;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      console.log(req.user, "<req");
      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { CatatanTrialID: +id },
      //   });
      //   await t_catatanTrial.update(
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

      const prevProsesPengemasan = await t_formulaFix_prosesPengemasan.findAll({
        where: {
          FormulaFixID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevProsesPengemasan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "<new");
          console.log(id, "< ID");

          if (!newItem?.id) {
            const created = await t_formulaFix_prosesPengemasan.create(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_prosesPengemasan.update(
              {
                title: newItem?.title || "",
                contents: newItem?.contents || null,
                FormulaFixID: +id || null,
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
        await t_formulaFix_prosesPengemasan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_prosesPengemasan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_prosesPengemasan.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        statusCode: 200,
        message: "SUCCESS",
        data: newData,
      });
    } catch (err) {
      console.log(err, "<er");
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async handleSaveRancanganSpesifikasiObatJadi(req, res) {
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
      const flag_update = "UPDATE FOR DELETE";
      const formula = await t_formulaFix.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { CatatanTrialID: +id },
      //   });
      //   await t_catatanTrial.update(
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

      const prevRancangan =
        await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
          where: {
            FormulaFixID: id,
          },
          order: [["id", "ASC"]],
        });

      const existing = prevRancangan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created =
              await t_formulaFix_rancanganSpesifikasiObatJadi.create(
                {
                  parameter: newItem?.parameter || "",
                  spesifikasi: newItem?.spesifikasi || "",
                  referensi: newItem?.referensi || "",
                  justifikasi: newItem?.justifikasi || "",
                  FormulaFixID: +id || null,
                  user_id,
                  delegated_to,
                },
                { transaction }
              );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_formulaFix_rancanganSpesifikasiObatJadi.update(
              {
                parameter: newItem?.parameter || "",
                spesifikasi: newItem?.spesifikasi || "",
                referensi: newItem?.referensi || "",
                justifikasi: newItem?.justifikasi || "",
                FormulaFixID: +id || null,
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
        await t_formulaFix_rancanganSpesifikasiObatJadi.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_formulaFix_rancanganSpesifikasiObatJadi.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_formulaFix_rancanganSpesifikasiObatJadi.findAll({
        where: {
          FormulaFixID: +id,
        },
        order: [["id", "ASC"]],
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

  static async uploadDataStabilitas(req, res) {
    const { id } = req.params;
    try {
      const pdf = await t_formulaFix_dataStabilitas.create({
        uploadType: req.file.originalname,
        upload: req.file.buffer, // Store PDF as binary data
        FormulaFixID: +id,
      });

      console.log(pdf, "< pdf");

      res.json({ message: "PDF uploaded successfully", pdfId: pdf.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error uploading PDF" });
    }
  }
  static async getUploadDataStabilitas(req, res) {
    try {
      const { id } = req.params;
      console.log(id, "< Ini id");

      const upload = await t_formulaFix_dataStabilitas.findOne({
        where: { FormulaFixID: +id },
      });

      // Check if upload is found
      if (!upload) {
        return res.status(404).json({ error: "No upload found" });
      }

      const uploadData = upload.toJSON(); // Convert to JSON

      // Process the upload field if it exists
      if (uploadData.upload) {
        uploadData.upload = Buffer.from(uploadData.upload).toString("base64");
      } else {
        uploadData.upload = null;
      }

      console.log(uploadData, "< aray");

      res.json(uploadData); // Send the processed upload data
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching images" });
    }
  }

  static async uploadAcuanCatatanTrial(req, res) {
    const { id } = req.params;
    try {
      const pdf = await t_formulaFix_acuanCatatanTrial.create({
        uploadType: req.file.originalname,
        upload: req.file.buffer, // Store PDF as binary data
        FormulaFixID: +id,
      });

      console.log(pdf, "< pdf");

      res.json({ message: "PDF uploaded successfully", pdfId: pdf.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error uploading PDF" });
    }
  }
  static async getUploadAcuanCatatanTrial(req, res) {
    try {
      const { id } = req.params;
      const upload = await t_formulaFix_acuanCatatanTrial.findOne({
        where: { FormulaFixID: +id },
      });

      if (!upload) {
        return res.status(404).json({ error: "No Upload found" });
      }

      const uploadData = upload.toJSON();

      if (uploadData.upload) {
        uploadData.upload = Buffer.from(uploadData.upload).toString("base64");
      } else {
        uploadData.upload = null;
      }

      res.json(uploadData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching images" });
    }
  }
  static async deleteFormulaFix(req, res) {
    try {
      const { id } = req.params;

      await t_formulaFix.destroy({
        where: { id: +id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerFormulaFix;
