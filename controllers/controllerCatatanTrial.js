const {
  t_catatanTrial,
  t_komposisiCatatanTrial,
  t_perhitunganZatAktif,
  t_metodePembuatan,
  t_prosesCatatanTrialPadat,
  t_prosesCatatanTrialPenyalutan,
  t_formulaCatatanTrial,
  t_pengamatanAwalCair,
  t_pengamatanLanjutan,
  t_pengamatanAwalPadat,
  t_pengamatanAwalSteril,
  t_pengamatanAwalPenyalutan,
  t_catatanTrial_status,
  m_bentuk_sediaan,
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

class ControllerCatatanTrial {
  static async approvePemohon(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, inisial_user, bagian_user } =
        req.user;

      const {
        is_approve_1,
        approver_tanggal_1,
        keterangan_reject_1,
        // is_approve_2,
        // keterangan_reject_2,
      } = req.body;
      const { id } = req.params;
      const findStudiPemohon = await t_catatanTrial.findByPk(+id);
      if (!findStudiPemohon)
        throw new MyError(404, "Form studi tidak ditemukan");

      if (bagian_user === "RD1") {
        await t_catatanTrial.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
            statusDokumen: "Menunggu Approve Manager/Ast.Manager",
          },
          {
            where: {
              id,
            },
          }
        );
      } else if (bagian_user === "RD2") {
        await t_catatanTrial.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
            statusDokumen: "Menunggu Approve Manager/Ast.Manager",
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

  static async findAllNamaProduct01(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `SELECT Product_ID, Product_Name, Product_Category FROM m_product WHERE Product_Category = '01' AND isActive = '1';
          `,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async findAllNamaProduct02(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `SELECT Product_ID, Product_Name, Product_Category FROM m_product WHERE Product_Category = '02' AND isActive = '1';
          `,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }
  static async createCatatanTrial(req, res, next) {
    try {
      const { user_id, delegated_to, nama_user, bagian_user } = req.user;

      const {
        tanggalTrial,
        namaProduk,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
        filter,
        tipeCatatanTrial,
        upload,
      } = req.body;

      const createCatatanTrial = await t_catatanTrial.create({
        tanggalTrial: tanggalTrial || "",
        namaProduk: namaProduk || "",
        trialKe: trialKe || "",
        bentukSediaan: bentukSediaan || "",
        productKompetitor: productKompetitor || "",
        statusB: statusB || "",
        statusA: statusA || "",
        filter: filter || "",
        tipeCatatanTrial: tipeCatatanTrial || "",
        pic: nama_user || "",
        bagian: bagian_user || "",
        upload: upload || [],
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create CatatanTrial",
        data: createCatatanTrial,
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updateCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const {
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
        filter,
        tipeCatatanTrial,
        upload,
      } = req.body;

      let newUpload = upload?.filter((item) => item.trim() !== "");

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const [updatedRowsCount] = await t_catatanTrial.update(
        {
          tanggalTrial: tanggalTrial || "",
          namaProduk: namaProduk || "",
          kodeTrial: kodeTrial || "",
          trialKe: trialKe || "",
          bentukSediaan: bentukSediaan || "",
          productKompetitor: productKompetitor || "",
          statusB: statusB || "",
          statusA: statusA || "",
          filter: filter || "",
          tipeCatatanTrial: tipeCatatanTrial || "",
          upload: newUpload,
        },
        {
          where: { id: id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async findNamaBahanBaku(req, res) {
    try {
      const config = {
        user: process.env.MS_SQL_DB_USER,
        password: process.env.MS_SQL_DB_PWD,
        server: process.env.MS_SQL_DB_SERVER,
        database: process.env.MS_SQL_DB_NAME,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      };

      sql.connect(config, function (err) {
        if (err) console.log(err);
        const request = new sql.Request();
        request.query(
          `
          SELECT ItemID,ItemName,Analisa,batchno,principle FROM t_NP_Sample_Stock WHERE ItemID != '' AND ItemID != '-'
          ;
          `,
          async function (err, { recordset }) {
            if (err) console.log(err);
            res.status(200).json(recordset);
          }
        );
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async handleSaveKomposisiCatatanTrial(req, res) {
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
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKomposisi = await t_komposisiCatatanTrial.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_komposisiCatatanTrial.create(
              {
                kode: newItem?.kode || "",
                namaBahanBaku: newItem?.namaBahanBaku || "",
                principle: newItem?.principle || "",
                jumlahTiapSediaan: newItem?.jumlahTiapSediaan || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_komposisiCatatanTrial.update(
              {
                kode: newItem?.kode || "",
                namaBahanBaku: newItem?.namaBahanBaku || "",
                principle: newItem?.principle || "",
                jumlahTiapSediaan: newItem?.jumlahTiapSediaan || "",
                CatatanTrialID: +id || null,
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
        await t_komposisiCatatanTrial.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_komposisiCatatanTrial.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_komposisiCatatanTrial.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePerhitunganZatAktif(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevPerhitunganZatAktif = await t_perhitunganZatAktif.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevPerhitunganZatAktif.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_perhitunganZatAktif.create(
              {
                padaEtiket: newItem?.padaEtiket || "",
                bahanBakuYangDigunakan: newItem?.bahanBakuYangDigunakan || "",
                perhitunganBahanBaku: newItem?.perhitunganBahanBaku || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_perhitunganZatAktif.update(
              {
                padaEtiket: newItem?.padaEtiket || "",
                bahanBakuYangDigunakan: newItem?.bahanBakuYangDigunakan || "",
                perhitunganBahanBaku: newItem?.perhitunganBahanBaku || "",
                CatatanTrialID: +id || null,
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
        await t_perhitunganZatAktif.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_perhitunganZatAktif.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_perhitunganZatAktif.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSaveMetodePembuatan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevMetodePembuatan = await t_metodePembuatan.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevMetodePembuatan.map((item) => item?.id);
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
            const created = await t_metodePembuatan.create(
              {
                aktivitas: newItem?.aktivitas || "",
                pengamatan: newItem?.pengamatan || "",
                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_metodePembuatan.update(
              {
                aktivitas: newItem?.aktivitas || "",
                pengamatan: newItem?.pengamatan || "",
                tableIndex: newItem?.tableIndex ?? null,
                CatatanTrialID: +id || null,
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
        await t_metodePembuatan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_metodePembuatan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_metodePembuatan.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSaveProsesCatatanTrialPadat(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevProsesCatatanTrialPadat =
        await t_prosesCatatanTrialPadat.findAll({
          where: {
            CatatanTrialID: id,
          },
        });

      const existing = prevProsesCatatanTrialPadat.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_prosesCatatanTrialPadat.create(
              {
                speed: newItem?.speed || "",
                mainPressure: newItem?.mainPressure || "",
                prePressure: newItem?.prePressure || "",
                settingBobot: newItem?.settingBobot || "",
                kekerasan: newItem?.kekerasan || "",
                tebal: newItem?.tebal || "",
                abrasi: newItem?.abrasi || "",
                wh: newItem?.wh || "",
                keterangan: newItem?.keterangan || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_prosesCatatanTrialPadat.update(
              {
                speed: newItem?.speed || "",
                mainPressure: newItem?.mainPressure || "",
                prePressure: newItem?.prePressure || "",
                settingBobot: newItem?.settingBobot || "",
                kekerasan: newItem?.kekerasan || "",
                tebal: newItem?.tebal || "",
                abrasi: newItem?.abrasi || "",
                wh: newItem?.wh || "",
                keterangan: newItem?.keterangan || "",
                CatatanTrialID: +id || null,
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
        await t_prosesCatatanTrialPadat.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_prosesCatatanTrialPadat.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_prosesCatatanTrialPadat.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSaveProsesCatatanTrialPenyalutan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevProsesCatatanTrialPenyalutan =
        await t_prosesCatatanTrialPenyalutan.findAll({
          where: {
            CatatanTrialID: id,
          },
        });

      const existing = prevProsesCatatanTrialPenyalutan.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update
      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru
          if (!newItem?.id) {
            const created = await t_prosesCatatanTrialPenyalutan.create(
              {
                tanggal: newItem?.tanggal || "",
                jam: newItem?.jam || "",
                turretSpeed: newItem?.turretSpeed || "",
                suhu: newItem?.suhu || "",
                bobot: newItem?.bobot || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_prosesCatatanTrialPenyalutan.update(
              {
                tanggal: newItem?.tanggal || "",
                jam: newItem?.jam || "",
                turretSpeed: newItem?.turretSpeed || "",
                suhu: newItem?.suhu || "",
                bobot: newItem?.bobot || "",
                CatatanTrialID: +id || null,
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
        await t_prosesCatatanTrialPenyalutan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_prosesCatatanTrialPenyalutan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_prosesCatatanTrialPenyalutan.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalCair(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKomposisi = await t_pengamatanAwalCair.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalCair.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalCair: newItem?.pengamatanAwalCair || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalCair.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalCair: newItem?.pengamatanAwalCair || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalCair.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalCair.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalCair.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalSteril(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKomposisi = await t_pengamatanAwalSteril.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalSteril.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalSteril: newItem?.pengamatanAwalSteril || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalSteril.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                pengamatanAwalSteril: newItem?.pengamatanAwalSteril || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalSteril.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalSteril.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalSteril.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalPadat(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKomposisi = await t_pengamatanAwalPadat.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalPadat.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                spesifikasiKekerasanTablet:
                  newItem?.spesifikasiKekerasanTablet || "",
                settingKekerasanTablet: newItem?.settingKekerasanTablet || "",
                evaluasiKekerasanTablet: newItem?.evaluasiKekerasanTablet || [],
                rataRataKekerasanTablet: newItem?.rataRataKekerasanTablet || "",
                spesifikasiKerapuhan: newItem?.spesifikasiKerapuhan || "",
                settingKerapuhan: newItem?.settingKerapuhan || "",
                evaluasiKerapuhan: newItem?.evaluasiKerapuhan || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiUkuran: newItem?.spesifikasiUkuran || "",
                settingUkuran: newItem?.settingUkuran || "",
                evaluasiUkuran: newItem?.evaluasiUkuran || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalPadat.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                spesifikasiKekerasanTablet:
                  newItem?.spesifikasiKekerasanTablet || "",
                settingKekerasanTablet: newItem?.settingKekerasanTablet || "",
                evaluasiKekerasanTablet: newItem?.evaluasiKekerasanTablet || [],
                rataRataKekerasanTablet: newItem?.rataRataKekerasanTablet || "",
                spesifikasiKerapuhan: newItem?.spesifikasiKerapuhan || "",
                settingKerapuhan: newItem?.settingKerapuhan || "",
                evaluasiKerapuhan: newItem?.evaluasiKerapuhan || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiUkuran: newItem?.spesifikasiUkuran || "",
                settingUkuran: newItem?.settingUkuran || "",
                evaluasiUkuran: newItem?.evaluasiUkuran || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalPadat.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalPadat.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalPadat.findAll({
        where: {
          CatatanTrialID: +id,
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
  static async handleSavePengamatanAwalPenyalutan(req, res) {
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

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const prevKomposisi = await t_pengamatanAwalPenyalutan.findAll({
        where: {
          CatatanTrialID: id,
        },
      });

      const existing = prevKomposisi.map((item) => item?.id);
      const newItemId = data
        ? data.filter((item) => item?.id).map((item) => +item?.id)
        : [];

      // update

      await Promise.all(
        data?.map(async (newItem) => {
          //cek kalo gada id , create baru

          if (!newItem?.id) {
            const created = await t_pengamatanAwalPenyalutan.create(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiWeightGain: newItem?.spesifikasiWeightGain || "",
                settingWeightGain: newItem?.settingWeightGain || "",
                evaluasiWeightGain: newItem?.evaluasiWeightGain || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                settingKeseragamanBobot: newItem?.rataRataKekerasanTablet || "",
                evaluasiKeseragamanBobot:
                  newItem?.evaluasiKeseragamanBobot || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiDimensi: newItem?.spesifikasiDimensi || "",
                settingDimensi: newItem?.settingDimensi || "",
                evaluasiDimensi: newItem?.evaluasiDimensi || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                CatatanTrialID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_pengamatanAwalPenyalutan.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                spesifikasiWeightGain: newItem?.spesifikasiWeightGain || "",
                settingWeightGain: newItem?.settingWeightGain || "",
                evaluasiWeightGain: newItem?.evaluasiWeightGain || "",
                spesifikasiPemerian: newItem?.spesifikasiPemerian || "",
                settingPemerian: newItem?.settingPemerian || "",
                evaluasiPemerian: newItem?.evaluasiPemerian || "",
                spesifikasiKeseragamanBobot:
                  newItem?.spesifikasiKeseragamanBobot || "",
                settingKeseragamanBobot: newItem?.rataRataKekerasanTablet || "",
                evaluasiKeseragamanBobot:
                  newItem?.evaluasiKeseragamanBobot || "",
                spesifikasiKetebalan: newItem?.spesifikasiKetebalan || "",
                settingKetebalan: newItem?.settingKetebalan || "",
                evaluasiKetebalan: newItem?.evaluasiKetebalan || [],
                rataRataKetebalan: newItem?.rataRataKetebalan || "",
                spesifikasiDimensi: newItem?.spesifikasiDimensi || "",
                settingDimensi: newItem?.settingDimensi || "",
                evaluasiDimensi: newItem?.evaluasiDimensi || "",
                spesifikasiWaktuHancur: newItem?.spesifikasiWaktuHancur || "",
                settingWaktuHancur: newItem?.settingWaktuHancur || "",
                evaluasiWaktuHancur: newItem?.evaluasiWaktuHancur || "",
                CatatanTrialID: +id || null,
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
        await t_pengamatanAwalPenyalutan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_pengamatanAwalPenyalutan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_pengamatanAwalPenyalutan.findAll({
        where: {
          CatatanTrialID: +id,
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

  // handle post dan edit formula catatan trial
  static async createFormulaCatatanTrial(req, res, next) {
    try {
      const {
        tujuanTrial,
        tiapSediaan,
        besarBets,
        overmaat,
        satuan,
        bentukSediaan,
        kodeTrials,
        detailFormula,
        CatatanTrialID,
      } = req.body;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const createFormula = await t_formulaCatatanTrial.create({
        tujuanTrial: tujuanTrial,
        tiapSediaan: tiapSediaan,
        besarBets: besarBets,
        overmaat: overmaat,
        satuan: satuan,
        bentukSediaan: bentukSediaan,
        kodeTrials: kodeTrials,
        detailFormula: detailFormula,
        CatatanTrialID: +CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create Formula Catatan Trial",
        data: createFormula,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updateFormulaCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const {
        tujuanTrial,
        tiapSediaan,
        besarBets,
        overmaat,
        satuan,
        bentukSediaan,
        kodeTrials,
        detailFormula,
      } = req.body;

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const [updatedRowsCount] = await t_formulaCatatanTrial.update(
        {
          tujuanTrial: tujuanTrial || "",
          tiapSediaan: tiapSediaan || "",
          besarBets: +besarBets || null,
          overmaat: +overmaat || null,
          satuan: satuan || "",
          bentukSediaan: bentukSediaan || "",
          kodeTrials: kodeTrials || "",
          detailFormula: detailFormula || "",
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "formula Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "formula Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<<<< ERROR");
      next(err);
    }
  }

  // handle post dan edit pengamatan awal cair
  static async createPengamatanAwalCair(req, res, next) {
    try {
      const { pengamatanAwalCair, CatatanTrialID } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalCair = await t_pengamatanAwalCair.create({
        pengamatanAwalCair: pengamatanAwalCair,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create proses Catatna trial padat",
        data: createPengamatanAwalCair,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalCair(req, res, next) {
    try {
      const { id } = req.params;

      const pengamatanAwalCairData = req.body.data; // Access req.body.data
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const updatedPengamatanCair = await t_pengamatanAwalCair.update(
        {
          pengamatanAwalCair: pengamatanAwalCairData || null,
        },
        {
          where: { id: +id },
        }
      );

      res.status(201).json({
        message: "pengamatan awal cair Catatan Trial updated successfully",
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  // handle post dan edit pengamatan awal steril

  static async createPengamatanAwalSteril(req, res, next) {
    try {
      const { pengamatanAwalSteril, CatatanTrialID } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalSteril = await t_pengamatanAwalSteril.create({
        pengamatanAwalSteril: pengamatanAwalSteril,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create proses Catatna trial steril",
        data: createPengamatanAwalSteril,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalSteril(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const pengamatanAwalSterilData = req.body.data; // Access req.body.data

      const updatedPengamatanSteril = t_pengamatanAwalSteril.update(
        {
          pengamatanAwalSteril: pengamatanAwalSterilData || null,
        },
        {
          where: { id: +id },
        }
      );

      res.status(201).json({
        message: "pengamatan awal steril Catatan Trial updated successfully",
      });
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  // handle post dan edit pengamatan awal padat
  static async createPengamatanAwalPadat(req, res, next) {
    try {
      const {
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
        CatatanTrialID,
      } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalPadat = await t_pengamatanAwalPadat.create({
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet: evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan: evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create pengamatan awal padat",
        data: createPengamatanAwalPadat,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalPadat(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const {
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        spesifikasiKekerasanTablet,
        settingKekerasanTablet,
        evaluasiKekerasanTablet,
        rataRataKekerasanTablet,
        spesifikasiKerapuhan,
        settingKerapuhan,
        evaluasiKerapuhan,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiUkuran,
        settingUkuran,
        evaluasiUkuran,
      } = req.body;

      const [updatedRowsCount] = await t_pengamatanAwalPadat.update(
        {
          spesifikasiPemerian: spesifikasiPemerian || "",
          settingPemerian: settingPemerian || "",
          evaluasiPemerian: evaluasiPemerian || "",
          spesifikasiKeseragamanBobot: spesifikasiKeseragamanBobot || "",
          spesifikasiKekerasanTablet: spesifikasiKekerasanTablet || "",
          settingKekerasanTablet: settingKekerasanTablet || "",
          evaluasiKekerasanTablet: evaluasiKekerasanTablet || [],
          rataRataKekerasanTablet: rataRataKekerasanTablet || "",
          spesifikasiKerapuhan: spesifikasiKerapuhan || "",
          settingKerapuhan: settingKerapuhan || "",
          evaluasiKerapuhan: evaluasiKerapuhan || "",
          spesifikasiKetebalan: spesifikasiKetebalan || "",
          settingKetebalan: settingKetebalan || "",
          evaluasiKetebalan: evaluasiKetebalan || [],
          rataRataKetebalan: rataRataKetebalan || "",
          spesifikasiUkuran: spesifikasiUkuran || "",
          settingUkuran: settingUkuran || "",
          evaluasiUkuran: evaluasiUkuran || "",
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal padat updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal padat not found",
        });
      }
    } catch (err) {
      console.log(err, "<<<< ERROR");
      next(err);
    }
  }

  // handle post dan edit pengamatan lanjutan
  static async createPengamatanLanjutan(req, res, next) {
    try {
      const { kodeTrialHeaders, content, CatatanTrialID } = req.body;

      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      const createPengamatanLanjutan = await t_pengamatanLanjutan.create({
        kodeTrialHeaders,
        content,
        CatatanTrialID,
        user_id,
        delegated_to,
      });

      res.status(201).json({
        message: "Success Create pengamatanLAnjutan",
        data: createPengamatanLanjutan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalLanjutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const { kodeTrialHeaders, content } = req.body;

      const [updatedRowsCount] = await t_pengamatanLanjutan.update(
        {
          kodeTrialHeaders: kodeTrialHeaders || "",
          content: content || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan lanjutan Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan lanjutan Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  // handle post dan edit pengamatan awal penyalutan
  static async createPengamatanAwalPenyalutan(req, res, next) {
    try {
      const {
        spesifikasiWeightGain,
        settingWeightGain,
        evaluasiWeightGain,
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        settingKeseragamanBobot,
        evaluasiKeseragamanBobot,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiDimensi,
        settingDimensi,
        evaluasiDimensi,
        spesifikasiWaktuHancur,
        settingWaktuHancur,
        evaluasiWaktuHancur,
        CatatanTrialID,
      } = req.body;
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;
      const createPengamatanAwalPenyalutan =
        await t_pengamatanAwalPenyalutan.create({
          spesifikasiWeightGain,
          settingWeightGain,
          evaluasiWeightGain,
          spesifikasiPemerian,
          settingPemerian,
          evaluasiPemerian,
          spesifikasiKeseragamanBobot,
          settingKeseragamanBobot,
          evaluasiKeseragamanBobot,
          spesifikasiKetebalan,
          settingKetebalan,
          evaluasiKetebalan,
          rataRataKetebalan,
          spesifikasiDimensi,
          settingDimensi,
          evaluasiDimensi,
          spesifikasiWaktuHancur,
          settingWaktuHancur,
          evaluasiWaktuHancur,
          CatatanTrialID,
          user_id,
          delegated_to,
        });

      res.status(201).json({
        message: "Success Create pengamatan awal penyalutan",
        data: createPengamatanAwalPenyalutan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updatePengamatanAwalPenyalutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL

      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const {
        spesifikasiWeightGain,
        settingWeightGain,
        evaluasiWeightGain,
        spesifikasiPemerian,
        settingPemerian,
        evaluasiPemerian,
        spesifikasiKeseragamanBobot,
        settingKeseragamanBobot,
        evaluasiKeseragamanBobot,
        spesifikasiKetebalan,
        settingKetebalan,
        evaluasiKetebalan,
        rataRataKetebalan,
        spesifikasiDimensi,
        settingDimensi,
        evaluasiDimensi,
        spesifikasiWaktuHancur,
        settingWaktuHancur,
        evaluasiWaktuHancur,
      } = req.body;

      const [updatedRowsCount] = await t_pengamatanAwalPenyalutan.update(
        {
          spesifikasiWeightGain: spesifikasiWeightGain || "",
          settingWeightGain: settingWeightGain || "",
          evaluasiWeightGain: evaluasiWeightGain || "",
          spesifikasiPemerian: spesifikasiPemerian || "",
          settingPemerian: settingPemerian || "",
          evaluasiPemerian: evaluasiPemerian || "",
          spesifikasiKeseragamanBobot: spesifikasiKeseragamanBobot || "",
          settingKeseragamanBobot: settingKeseragamanBobot || "",
          evaluasiKeseragamanBobot: evaluasiKeseragamanBobot || "",
          spesifikasiKetebalan: spesifikasiKetebalan || "",
          settingKetebalan: settingKetebalan || "",
          evaluasiKetebalan: evaluasiKetebalan || [],
          rataRataKetebalan: rataRataKetebalan || "",
          spesifikasiDimensi: spesifikasiDimensi || "",
          settingDimensi: settingDimensi || "",
          evaluasiDimensi: evaluasiDimensi || "",
          spesifikasiWaktuHancur: spesifikasiWaktuHancur || "",
          settingWaktuHancur: settingWaktuHancur || "",
          evaluasiWaktuHancur: evaluasiWaktuHancur || "",
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal penyalutan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal penyalutan not found",
        });
      }
    } catch (err) {
      console.log(err, "<<<< ERROR");
      next(err);
    }
  }

  static async updatePerhitunganBatasBahanTambahan(req, res) {
    try {
      const { CatatanTrialID } = req.params;

      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }

      const { perhitunganBatasBahanTambahan } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updatePerhitunganBatasBahanTambahan = await t_catatanTrial.update(
        { perhitunganBatasBahanTambahan: perhitunganBatasBahanTambahan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updatePerhitunganBatasBahanTambahan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updatePembahasan(req, res) {
    try {
      const { CatatanTrialID } = req.params;

      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      const { pembahasan } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updatePembahasan = await t_catatanTrial.update(
        { pembahasan: pembahasan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updatePembahasan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateKesimpulan(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      const { kesimpulan } = req.body;

      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateKesimpulan = await t_catatanTrial.update(
        { kesimpulan: kesimpulan },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );

      res.status(200).json(updateKesimpulan);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateTindakLanjut(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      const { tindakLanjut } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateTindakLanjut = await t_catatanTrial.update(
        { tindakLanjut: tindakLanjut },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateTindakLanjut);
    } catch (err) {
      console.log(err);
    }
  }
  static async updateUpload(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const cat = await t_catatanTrial.findByPk(+CatatanTrialID);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +CatatanTrialID },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      const { upload } = req.body;
      const findCatatanTrialID = await t_catatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateUpload = await t_catatanTrial.update(
        { upload: upload },
        {
          where: {
            id: findCatatanTrialID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateUpload);
    } catch (err) {
      console.log(err);
    }
  }
  static async approveCatatanTrial(req, res, next) {
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
      const findCatatanTrial = await t_catatanTrial.findByPk(+id);
      if (!findCatatanTrial)
        throw new MyError(404, "Form CatatanTrial tidak ditemukan");
      const apprNo = await checkStatusCatatanTrial(id);

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "catatanTrial",
        findCatatanTrial.bagian,
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
        statusDokumen = getStatusCatatanTrial(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) statusDokumen = "Closed";
      if (is_approve === false) {
        statusDokumen = "Reject";
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
      }

      await t_catatanTrial_status.create({
        CatatanTrialID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_catatanTrial.update(
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

  // get komposisi nama nahan
  static async getKomposisiNamaBahan(req, res) {
    const { id } = req.params;
    try {
      const komposisi = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(komposisi);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  // get catatan trial padat saja
  static async getFilterCatatanTrialPadat(req, res) {
    try {
      const catatanTrialPadat = await t_catatanTrial.findAll({
        where: { tipeCatatanTrial: "catatan trial padat" },
      });

      // if (!cqaDetails || cqaDetails.length === 0) {
      //   throw new MyError(404, "Not found!");
      // }

      res.status(200).json(catatanTrialPadat);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  //  get bentuk sediaan cair
  static async getBentukSediaanCategoryCair(req, res) {
    try {
      const bentukSediaanCair = await m_bentuk_sediaan.findAll({
        where: { category: "cair" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanCair.length === 0) {
        throw new Error("No 'cair' categories found");
      }

      res.status(200).json(bentukSediaanCair);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  //get bentuk sediaan padat
  static async getBentukSediaanCategoryPadat(req, res) {
    try {
      const bentukSediaanPadat = await m_bentuk_sediaan.findAll({
        where: { category: "padat" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanPadat.length === 0) {
        throw new Error("No 'Padat' categories found");
      }

      res.status(200).json(bentukSediaanPadat);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  // get bentuk sediaan steril
  static async getBentukSediaanCategorySteril(req, res) {
    try {
      const bentukSediaanSteril = await m_bentuk_sediaan.findAll({
        where: { category: "steril" },
        attributes: ["bentukSediaan", "category"], // Selecting only 'bentukSediaan' and 'category'
      });

      // Assuming you want to throw an error if the data is empty
      if (bentukSediaanSteril.length === 0) {
        throw new Error("No 'Steril' categories found");
      }

      res.status(200).json(bentukSediaanSteril);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  // list all catatan trial
  static async findAllCatatanTrial(req, res) {
    try {
      const {
        page,
        namaProduk,
        trialKe,
        tipeCatatanTrial,
        pic,
        bagian,
        statusDokumen,
        alasan,
      } = req.query;
      const size = page ? 10 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (trialKe) searchParams.trialKe = { [Op.iLike]: `%${trialKe}%` };
      if (tipeCatatanTrial)
        searchParams.tipeCatatanTrial = { [Op.iLike]: `%${tipeCatatanTrial}%` };
      if (namaProduk) if (pic) searchParams.pic = { [Op.iLike]: `%${pic}%` };

      if (bagian) searchParams.bagian = { [Op.iLike]: `%${bagian}%` };

      if (statusDokumen)
        searchParams.statusDokumen = {
          [Op.iLike]: `%${statusDokumen}%`,
        };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };

      const brief = await t_catatanTrial.findAndCountAll({
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

  static async getCatatanTrialDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      // const user = req.user;

      // const user_id = user?.user?.log_NIK;

      const { id } = req.params;

      let catatanTrialDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        catatanTrialDetails = await t_catatanTrial?.findOne({
          where: {
            id,
          },
          include: { model: t_catatanTrial_status, as: "approver_data" },
          order: [
            [
              { model: t_catatanTrial_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });

        catatanTrialDetails.dataValues.approver_inisial_1 =
          await fetchApproverInisial({
            user_id: catatanTrialDetails.dataValues.approver_user_id_1,
            delegated_to:
              catatanTrialDetails.dataValues.approver_delegated_to_1,
          });
        catatanTrialDetails.dataValues.approver_inisial_2 =
          await fetchApproverInisial({
            user_id: catatanTrialDetails.dataValues.approver_user_id_2,
            delegated_to:
              catatanTrialDetails.dataValues.approver_delegated_to_2,
          });
      } else {
        catatanTrialDetails = await t_catatanTrial.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_catatanTrial_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_catatanTrial_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }

      console.log(catatanTrialDetails, "< DETEL");

      catatanTrialDetails.dataValues.approver_inisial_1 =
        await fetchApproverInisial({
          user_id: catatanTrialDetails.dataValues.approver_user_id_1,
          delegated_to: catatanTrialDetails.dataValues.approver_delegated_to_1,
        });
      catatanTrialDetails.dataValues.approver_inisial_2 =
        await fetchApproverInisial({
          user_id: catatanTrialDetails.dataValues.approver_user_id_2,
          delegated_to: catatanTrialDetails.dataValues.approver_delegated_to_2,
        });
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = catatanTrialDetails.bagian;

      const apprNo = await checkStatusCatatanTrial(id);

      await Promise.all(
        catatanTrialDetails.dataValues.approver_data.map(async (el, index) => {
          el.dataValues.approver_inisial = await fetchApproverInisial({
            user_id: el.user_id,
            delegated_to: el.delegated_to,
          });

          return el;
        })
      );

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "catatanTrial",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );

      if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({ catatanTrialDetails, isApprove });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialCairDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailCair = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiCair = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifCair = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaCair = await t_formulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanCair = Object.values(metodePembuatanGrouped);

      const pengamatanAwalCair = await t_pengamatanAwalCair.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanCair = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });

      res.status(200).json({
        catatanTrialDetailCair,
        komposisiCair,
        perhitunganZatAktifCair,
        formulaCair,
        metodePembuatanCair,
        pengamatanAwalCair,
        pengamatanLanjutanCair,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  static async getCatatanTrialSterilDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailSteril = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiSteril = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifSteril = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaSteril = await t_formulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanSteril = Object.values(metodePembuatanGrouped);
      const pengamatanAwalSteril = await t_pengamatanAwalSteril.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanSteril = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);

      res.status(200).json({
        catatanTrialDetailSteril,
        komposisiSteril,
        perhitunganZatAktifSteril,
        formulaSteril,
        metodePembuatanSteril,
        pengamatanAwalSteril,
        pengamatanLanjutanSteril,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialPadatDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPadat = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiPadat = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifPadat = await t_perhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaPadat = await t_formulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanPadat = Object.values(metodePembuatanGrouped);
      const prosesCatatanTrialPadat = await t_prosesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPadat = await t_pengamatanAwalPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanPadat = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailPadat,
        komposisiPadat,
        perhitunganZatAktifPadat,
        formulaPadat,
        metodePembuatanPadat,
        prosesCatatanTrialPadat,
        pengamatanAwalPadat,
        pengamatanLanjutanPadat,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialPenyalutanDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPenyalutan = await t_catatanTrial.findOne({
        where: {
          id,
        },
      });

      const formulaPenyalutan = await t_formulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const prosesPenyalutan = await t_prosesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: id },
      });
      const metode = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
        order: [["id", "ASC"]],
      });

      // Group data by tableIndex
      const metodePembuatanGrouped = metode.reduce((acc, item) => {
        const index = item.tableIndex;
        if (!acc[index]) {
          acc[index] = [];
        }
        acc[index].push(item);
        return acc;
      }, {});

      // Convert grouped data into an array of arrays
      const metodePembuatanPenyalutan = Object.values(metodePembuatanGrouped);
      const pengamatanAwalPenyalutan = await t_pengamatanAwalPenyalutan.findAll(
        {
          where: { CatatanTrialID: id },
        }
      );

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailPenyalutan,
        formulaPenyalutan,
        metodePembuatanPenyalutan,
        prosesPenyalutan,
        pengamatanAwalPenyalutan,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  // get history
  static async getHistoryCatatanTrial(req, res, next) {
    try {
      const { id } = req.params;

      // find prosedur pengolahan table
      const catatanTrial = await t_catatanTrial.findByPk(+id);

      if (!catatanTrial) {
        res.status(404).json({ error: "Not Found" });
      } else {
        // find approval history table
        const approvalHistory = await t_catatanTrial_status.findAll({
          where: {
            CatatanTrialID: +id,
          },
          order: [["createdAt", "DESC"]],
        });

        res.status(200).json({ approvals: approvalHistory });
      }
    } catch (error) {
      next(error);
      console.log(error);
    }
  }
  // update perhitungan
  static async updatePerhitunganZatAktif(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      const cat = await t_catatanTrial.findByPk(+id);
      if (cat?.statusDokumen === "Reject") {
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
        await t_catatanTrial.update(
          {
            is_approve_1: "",
            approver_name_1: "",
            approver_user_id_1: "",
            approver_delegated_to_1: "",
            approver_tanggal_1: null,
            keterangan_reject_1: "",
            statusDokumen: "Draft",
          },
          {
            where: {
              id,
            },
          }
        );
      }
      const { padaEtiket, bahanBakuYangDigunakan, perhitunganBahanBaku } =
        req.body;

      const [updatedRowsCount] = await t_perhitunganZatAktif.update(
        {
          padaEtiket: padaEtiket || "",
          bahanBakuYangDigunakan: bahanBakuYangDigunakan || "",
          perhitunganBahanBaku: perhitunganBahanBaku || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "perhitungan zat aktif Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "perhitungan zat aktif Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  static async deleteCatatanTrial(req, res) {
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

      const findCatatanTrial = await t_catatanTrial.findByPk(+id);
      if (!findCatatanTrial)
        throw new MyError(404, "Form Catatan Trial tidak di temukan");

      // First, update all related records
      await t_catatanTrial_status.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_komposisiCatatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_perhitunganZatAktif.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_metodePembuatan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_prosesCatatanTrialPadat.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_prosesCatatanTrialPenyalutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_formulaCatatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalCair.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanLanjutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalPadat.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalSteril.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );
      await t_pengamatanAwalPenyalutan.update(
        { user_id, delegated_to, flag_update },
        { where: { CatatanTrialID: +id } }
      );

      // Next, delete all related records
      await t_catatanTrial_status.destroy({ where: { CatatanTrialID: +id } });
      await t_komposisiCatatanTrial.destroy({ where: { CatatanTrialID: +id } });
      await t_perhitunganZatAktif.destroy({ where: { CatatanTrialID: +id } });
      await t_metodePembuatan.destroy({ where: { CatatanTrialID: +id } });
      await t_prosesCatatanTrialPadat.destroy({
        where: { CatatanTrialID: +id },
      });
      await t_prosesCatatanTrialPenyalutan.destroy({
        where: { CatatanTrialID: +id },
      });
      await t_formulaCatatanTrial.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalCair.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanLanjutan.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalPadat.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalSteril.destroy({ where: { CatatanTrialID: +id } });
      await t_pengamatanAwalPenyalutan.destroy({
        where: { CatatanTrialID: +id },
      });

      // Finally, update and delete the main record
      await t_catatanTrial.update(
        { user_id, delegated_to, flag_update },
        { where: { id: +id } }
      );
      await t_catatanTrial.destroy({ where: { id: +id } });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}
8;
module.exports = ControllerCatatanTrial;
