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
const { fetchApproverInisial } = require("../services/mssqlService");
const { getStatus } = require("../helpers/statusProductBrief");

class ControllerStudiPraformulasi {
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
        keterangan_reject_2,
      } = req.body;
      const { id } = req.params;
      const findStudiPemohon = await t_studiPraformulasi.findByPk(+id);
      if (!findStudiPemohon)
        throw new MyError(404, "Form studi tidak ditemukan");

      // await t_studiPraformulasi_status.create({
      //   StudiPraformulasiID: id,
      //   approver_no: apprNo,
      //   is_approve,
      //   approver_inisial: inisial_user,
      //   approver_name: nama_user,
      //   approver_joblevel_id: joblevel_id_user,
      //   keterangan_reject,
      //   user_id,
      //   delegated_to,
      // });
      if (bagian_user === "RD1" || bagian_user === "RD1") {
        await t_studiPraformulasi.update(
          {
            is_approve_1,
            approver_name_1: nama_user,
            approver_user_id_1: user_id,
            approver_delegated_to_1: delegated_to,
            approver_tanggal_1: new Date(),
            keterangan_reject_1: keterangan_reject_1,
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
        throw new MyError(404, "Form ProductBrief tidak ditemukan");
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
        statusDokumen = getStatus(dataApprove.recordset[0]?.Appr_DefinitionID);

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

      await t_studiPraformulasi.destroy({
        where: { id: id }, // Corrected the where clause
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
      } = req.body;

      const createdStudiPraformulasi = await t_studiPraformulasi.create({
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
      });

      res.status(201).json({
        message: "Success Create CUY",
        data: createdStudiPraformulasi,
      });
    } catch (err) {
      console.error(err);
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
        message: "SUCCESS",
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
      const {
        user_id,
        delegated_to,
        nama_user,
        joblevel_id_user,
        inisial_user,
        bagian_user,
      } = req.user;

      console.log(id, "<<<<<");

      const prevKomposisi = await t_farmakologiKlinis.findAll({
        where: {
          StudiPraformulasiID: +id,
        },
      });

      const existing = prevKomposisi.map((item) => +item?.id);
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
      console.log(err);
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

  ///////////////////////////////

  // static async createKemasan(req, res, next) {
  //   try {
  //     const {
  //       StudiPraformulasiID,
  //       namaProduk,
  //       manufacturer,
  //       noBatch,
  //       tanggalProduksi,
  //       tanggalKadarluarsa,
  //       sumberPustaka,
  //       bentukSediaan,
  //       detailSediaan,
  //     } = req.body;

  //     const createKemasan = await Kemasan.create({
  //       StudiPraformulasiID: StudiPraformulasiID,
  //       namaProduk: namaProduk,
  //       manufacturer: manufacturer,
  //       noBatch: noBatch,
  //       tanggalProduksi: tanggalProduksi,
  //       tanggalKadarluarsa: tanggalKadarluarsa,
  //       sumberPustaka: sumberPustaka,
  //       bentukSediaan: bentukSediaan,
  //       detailSediaan: detailSediaan,
  //     });

  //     res.status(201).json({
  //       message: "Success Create kemasan",
  //       data: createKemasan,
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     next(err);
  //   }
  // }
  static async createKemasan(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;

      const { id } = req.params;

      await Promise.all(
        data?.map(async (newItem) => {
          const createKemasan = await t_kemasan.create(
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
            },
            { transaction }
          );
          return createKemasan?.id;
        })
      );

      await transaction.commit();

      const newData = await t_kemasan.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      res.status(201).json({
        message: "Success createKEmasan",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }

  static async editStudiPraformulasi(req, res, next) {
    const { id } = req.params;
    try {
      const {
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
      if (addendumKe) {
        obj.addendumKe = addendumKe;
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
      const studiNo = studi.addendumKe;
      console.log(studiNo, "<<<<<<<<<<<<<<<<<< STUDI");

      const [updatedRowsCount] = await t_studiPraformulasi.update(
        {
          ...obj,
          addendumKe: studiNo + 1,
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
  static async createDeskripsiProduct(req, res, next) {
    try {
      const {
        namaStudi,
        namaProduk,
        manufacturer,
        bentukSediaan,
        dosage,
        labelClaim,
        rutePemberian,
        aturanPakai,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      const createDeskripsiProduct = await t_deskripsiProduct.create({
        namaStudi,
        namaProduk,
        manufacturer,
        bentukSediaan,
        dosage,
        labelClaim,
        rutePemberian,
        aturanPakai,
        sumberPustaka,
        StudiPraformulasiID: +StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Deskripsi Product",
        data: createDeskripsiProduct,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async deleteDeskripsiProduct(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const deskripsi = await t_deskripsiProduct.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(deskripsi, "<<<des");

      if (deskripsi.length > 0) {
        await t_deskripsiProduct.destroy({
          where: { StudiPraformulasiID: +id }, // Corrected the where clause
        });

        res.status(200).send({ msg: "succeed" });
      } else {
        res.status(200).send({ msg: "" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
  static async createFarmalogiKlinis(req, res, next) {
    try {
      const {
        indikasi,
        mekanismeAksi,
        efekSamping,
        absorpsi,
        distribusi,
        metabolisme,
        eliminasi,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      const createFarmalogiKlinis = await t_farmakologiKlinis.create({
        indikasi,
        mekanismeAksi,
        efekSamping,
        absorpsi,
        distribusi,
        metabolisme,
        eliminasi,
        sumberPustaka,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Farmakologi Klinis",
        data: createFarmalogiKlinis,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async deleteFarmakologiKlinis(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const farm = await t_farmakologiKlinis.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(farm, "<<<des");

      if (farm.length > 0) {
        await t_farmakologiKlinis.destroy({
          where: { StudiPraformulasiID: +id }, // Corrected the where clause
        });

        res.status(200).send({ msg: "succeed" });
      } else {
        res.status(200).send({ msg: "" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
  static async createFormula(req, res, next) {
    try {
      const {
        bahanTambahan,
        kandungan,
        fungsi,
        prosesPembuatan,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      const createFormula = await t_formula.create({
        bahanTambahan,
        kandungan,
        fungsi,
        prosesPembuatan,
        sumberPustaka,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Formula",
        data: createFormula,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async deleteKemasan(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const kemasan = await t_kemasan.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(kemasan, "<<<des");

      if (kemasan.length > 0) {
        await Kemasan.destroy({
          where: { StudiPraformulasiID: +id }, // Corrected the where clause
        });

        res.status(200).send({ msg: "succeed" });
      } else {
        res.status(200).send({ msg: "" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
  static async editKemasan(req, res, next) {
    const { id } = req.params;
    try {
      const {
        namaProduk,
        manufacturer,
        noBatch,
        tanggalProduksi,
        tanggalKadarluarsa,
        sumberPustaka,
        bentukSediaan,
        detailSediaan,
      } = req.body;

      const [updatedRowsCount] = await t_kemasan.update(
        {
          namaProduk,
          manufacturer,
          noBatch,
          tanggalProduksi,
          tanggalKadarluarsa,
          sumberPustaka,
          bentukSediaan,
          detailSediaan,
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
  static async createFisikaKimia(req, res, next) {
    try {
      const {
        StudiPraformulasiID,
        namaProduk,
        manufacturer,
        noBatch,
        het,
        tanggalProduksi,
        tanggalKadarluarsa,
        bentukSediaan,
        sumberPustaka,
        detailSediaan,
      } = req.body;

      console.log(req.body);

      const createFisikaKimia = await t_karakteristikFisikakimia.create({
        StudiPraformulasiID: StudiPraformulasiID,
        namaProduk: namaProduk,
        manufacturer,
        noBatch,
        het,
        tanggalProduksi,
        tanggalKadarluarsa,
        bentukSediaan,
        sumberPustaka,
        detailSediaan,
      });

      res.status(201).json({
        message: "Success Create fisikakimia",
        data: createFisikaKimia,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createFisikaKimia(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;

      const { id } = req.params;

      await Promise.all(
        data?.map(async (newItem) => {
          const createFisikaKimia = await t_karakteristikFisikakimia.create(
            {
              namaProduk: newItem?.namaProduk || "",
              manufacturer: newItem?.manufacturer || "",
              noBatch: newItem?.noBatch || "",
              het: newItem?.het || "",
              tanggalProduksi: newItem?.tanggalProduksi || "",
              tanggalKadarluarsa: newItem?.tanggalKadarluarsa || "",
              sumberPustaka: newItem?.sumberPustaka || "",
              bentukSediaan: newItem?.bentukSediaan || "",
              detailSediaan: newItem?.detailSediaan || [],

              StudiPraformulasiID: +id || null,
            },
            { transaction }
          );
          return createFisikaKimia?.id;
        })
      );

      await transaction.commit();

      const newData = await t_karakteristikFisikakimia.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      res.status(201).json({
        message: "Success createFisikaKimia",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async createStabilita(req, res, next) {
    try {
      const {
        namaProduk,
        kondisiPenyimpanan,
        kondisiKhusus,
        hasilStudiStabilita,
        masaKadaluarsa,
        sumberPustaka,
        StudiPraformulasiID,
      } = req.body;

      const createStabilita = await t_stabilita.create({
        namaProduk,
        kondisiPenyimpanan,
        kondisiKhusus,
        hasilStudiStabilita,
        masaKadaluarsa,
        sumberPustaka,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Stabilita",
        data: createStabilita,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async deleteStabilita(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const stabilita = await t_stabilita.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (stabilita.length > 0) {
        await Stabilita.destroy({
          where: { StudiPraformulasiID: +id }, // Corrected the where clause
        });

        res.status(200).send({ msg: "succeed" });
      } else {
        res.status(200).send({ msg: "" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
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
  static async createKesimpulan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { kesimpulan } = req.body;
      const findStudiPraformulasiID = await t_studiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const createKesimpulan = await t_studiPraformulasi.update(
        { kesimpulan: kesimpulan },
        {
          where: {
            id: findStudiPraformulasiID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(createKesimpulan);
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
  static async testDownload(req, res, next) {
    console.log("hi");
    // try {
    //   // Simpan buffer foto ke database menggunakan Sequelize
    //   const dataPhoto = await Kemasan.findOne({
    //     where: {
    //       id: 3,
    //     },
    //   });
    //   // console.log(dataPhoto.detailSediaan.gambar, "<<");
    //   // const byteaToBase64 = (bytea) => {
    //   //   return Buffer.from(bytea, "binary").toString("base64");
    //   // };

    //   // const base64ImageData = byteaToBase64(dataPhoto.data);

    //   res.status(201).json(dataPhoto.detailSediaan.gambar);
    // } catch (error) {
    //   console.error(error);
    //   res.status(500).json({ error: "Internal Server Error" });
    // }
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
  static async editDeskripsiProduct(req, res, next) {
    const { id } = req.params;
    try {
      const {
        namaStudi,
        namaProduk,
        manufacturer,
        bentukSediaan,
        dosage,
        labelClaim,
        rutePemberian,
        aturanPakai,
        sumberPustaka,
      } = req.body;

      const [updatedRowsCount] = await t_deskripsiProduct.update(
        {
          namaStudi,
          namaProduk,
          manufacturer,
          bentukSediaan,
          dosage,
          labelClaim,
          rutePemberian,
          aturanPakai,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "des pro updated successfully",
        });
      } else {
        res.status(404).json({
          message: "des pro not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editFarmakologiKlinis(req, res, next) {
    const { id } = req.params;
    try {
      const {
        indikasi,
        mekanismeAksi,
        efekSamping,
        absorpsi,
        distribusi,
        metabolisme,
        eliminasi,
        sumberPustaka,
      } = req.body;

      const [updatedRowsCount] = await t_farmakologiKlinis.update(
        {
          indikasi,
          mekanismeAksi,
          efekSamping,
          absorpsi,
          distribusi,
          metabolisme,
          eliminasi,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "farm updated successfully",
        });
      } else {
        res.status(404).json({
          message: "farm not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editFormulaDetails(req, res, next) {
    const { id } = req.params;
    try {
      const {
        bahanTambahan,
        kandungan,
        fungsi,
        prosesPembuatan,
        sumberPustaka,
      } = req.body;

      const [updatedRowsCount] = await t_formula.update(
        {
          bahanTambahan,
          kandungan,
          fungsi,
          prosesPembuatan,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "formula updated successfully",
        });
      } else {
        res.status(404).json({
          message: "formula not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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

  static async editStabilita(req, res, next) {
    const { id } = req.params;
    try {
      const {
        namaProduk,
        kondisiPenyimpanan,
        kondisiKhusus,
        hasilStudiStabilita,
        masaKadaluarsa,
        sumberPustaka,
      } = req.body;

      const [updatedRowsCount] = await t_stabilita.update(
        {
          namaProduk,
          kondisiPenyimpanan,
          kondisiKhusus,
          hasilStudiStabilita,
          masaKadaluarsa,
          sumberPustaka,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "stab updated successfully",
        });
      } else {
        res.status(404).json({
          message: "stab not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editKarakteristikFisikaKimia(req, res, next) {
    const { id } = req.params;
    try {
      const {
        namaProduk,
        manufacturer,
        noBatch,
        het,
        tanggalProduksi,
        tanggalKadarluarsa,
        bentukSediaan,
        sumberPustaka,
        detailSediaan,
      } = req.body;

      const [updatedRowsCount] = await t_karakteristikFisikakimia.update(
        {
          namaProduk,
          manufacturer,
          noBatch,
          het,
          tanggalProduksi,
          tanggalKadarluarsa,
          bentukSediaan,
          sumberPustaka,
          detailSediaan,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "fisikaKimia updated successfully",
        });
      } else {
        res.status(404).json({
          message: "fisikaKimia not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUjiInkomptabilitas(req, res, next) {
    try {
      const { namaBahan, kondisi1, kondisi2, kondisi3, StudiPraformulasiID } =
        req.body;

      console.log(StudiPraformulasiID, " !@#@!#!@321");

      const createUjiInkomptabilitas = await t_ujiInkompatibilitas.create({
        namaBahan,
        kondisi1,
        kondisi2,
        kondisi3,
        StudiPraformulasiID: StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create",
        data: createUjiInkomptabilitas,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKontrolBahan(req, res, next) {
    try {
      const {
        namaBahan,
        parameter1,
        parameter2,
        parameter3,
        UjiInkompatibilitasID,
      } = req.body;

      const kontrolbahan = await t_kontrolBahan.create({
        namaBahan,
        parameter1,
        parameter2,
        parameter3,
        UjiInkompatibilitasID,
      });

      res.status(201).json({
        message: "Success Create",
        data: kontrolbahan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  // tambahan'

  static async createQtpp(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      console.log("asdasdsadasdasdsa12312");
      const { data } = req.body;

      const { id } = req.params;

      await Promise.all(
        data?.map(async (newItem) => {
          const createQtpp = await t_qtpp.create(
            {
              bentukSediaan: newItem?.bentukSediaan || "",
              targetBentukSediaan: newItem?.targetBentukSediaan || "",
              justifikasiBentukSediaan: newItem?.justifikasiBentukSediaan || "",
              detailSediaan: newItem?.detailSediaan || [],

              StudiPraformulasiID: +id || null,
            },
            { transaction }
          );
          return createQtpp?.id;
        })
      );

      await transaction.commit();

      const newData = await t_qtpp.findAll({
        where: {
          StudiPraformulasiID: id,
        },
      });

      res.status(201).json({
        message: "Success createQtpp",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
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

  static async createCqa(req, res, next) {
    try {
      const {
        qttpElements,
        target,
        safety,
        efficacy,
        formulaDanProses,
        apakahIniKritikalCqa,
        justifikasi,
        StudiPraformulasiID,
      } = req.body;

      const createCqa = await t_cqa.create({
        qttpElements,
        target,
        safety,
        efficacy,
        formulaDanProses,
        apakahIniKritikalCqa,
        justifikasi,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create Cqa",
        data: createCqa,
      });
    } catch (err) {
      console.error(err);
      next(err);
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

  static async createFormulaProtokol(req, res, next) {
    try {
      const {
        komposisi,
        fungsi,
        apakahAdaPadaKomposisiOriginatorKompetitor,
        justifikasi,
        StudiPraformulasiID,
      } = req.body;

      const createFormulaProtokol = await t_formulaProtokol.create({
        komposisi,
        fungsi,
        apakahAdaPadaKomposisiOriginatorKompetitor,
        justifikasi,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success Create FormulaProtokol",
        data: createFormulaProtokol,
      });
    } catch (err) {
      console.error(err);
      next(err);
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
      const createProsesPembuatan = await t_prosesPembuatan.create({
        prosesPembuatan,
        StudiPraformulasiID,
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
  static async createMappingProcess(req, res, next) {
    try {
      const {
        processParameters,
        materialAttributes,
        manufacturingProcess,
        qualityAttributes,
        StudiPraformulasiID,
      } = req.body;

      const createMappingProcess = await t_mappingProcess.create({
        processParameters,
        materialAttributes,
        manufacturingProcess,
        qualityAttributes,
        StudiPraformulasiID,
      });
      res.status(201).json({
        message: "Success Create mapping process",
        data: createMappingProcess,
      });
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editMappingProcess(req, res, next) {
    const { id } = req.params;
    try {
      const {
        processParameters,
        materialAttributes,
        manufacturingProcess,
        qualityAttributes,
      } = req.body;

      const [updatedRowsCount] = await t_mappingProcess.update(
        {
          processParameters,
          materialAttributes,
          manufacturingProcess,
          qualityAttributes,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "mapping process updated successfully",
        });
      } else {
        res.status(404).json({
          message: "mapping process not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
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

  static async createMaterial(req, res, next) {
    try {
      const {
        jumlahPenelitianAnalisaMaterial,
        kebutuhanAnalisaMaterial,
        biayaAnalisaMaterial,
        jumlahPenelitianOrientasiFormulaDanProses,
        kebutuhanOrientasiFormulaDanProses,
        biayaOrientasiFormulaDanProses,
        jumlahPenelitianOptimasiFormulaDanProses,
        kebutuhanOptimasiFormulaDanProses,
        biayaOptimasiFormulaDanProses,
        jumlahPenelitianStabilitaSkalaLab,
        kebutuhanStabilitaSkalaLab,
        biayaStabilitaSkalaLab,
        jumlahPenelitianSampelPerTinggal,
        kebutuhanSampelPerTinggal,
        biayaSampelPerTinggal,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        source,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;

      const createMaterial = await t_material.create({
        jumlahPenelitianAnalisaMaterial,
        kebutuhanAnalisaMaterial: +kebutuhanAnalisaMaterial,
        biayaAnalisaMaterial: +biayaAnalisaMaterial,
        jumlahPenelitianOrientasiFormulaDanProses,
        kebutuhanOrientasiFormulaDanProses,
        biayaOrientasiFormulaDanProses,
        jumlahPenelitianOptimasiFormulaDanProses,
        kebutuhanOptimasiFormulaDanProses,
        biayaOptimasiFormulaDanProses,
        jumlahPenelitianStabilitaSkalaLab,
        kebutuhanStabilitaSkalaLab,
        biayaStabilitaSkalaLab,
        jumlahPenelitianSampelPerTinggal,
        kebutuhanSampelPerTinggal,
        biayaSampelPerTinggal,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        source,
        tableIndex,
        StudiPraformulasiID,
      });

      res.status(201).json({
        message: "Success create material",
        data: createMaterial,
      });
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
  static async editMaterial(req, res, next) {
    const { id } = req.params;
    try {
      const {
        jumlahPenelitianAnalisaMaterial,
        kebutuhanAnalisaMaterial,
        biayaAnalisaMaterial,
        jumlahPenelitianOrientasiFormulaDanProses,
        kebutuhanOrientasiFormulaDanProses,
        biayaOrientasiFormulaDanProses,
        jumlahPenelitianOptimasiFormulaDanProses,
        kebutuhanOptimasiFormulaDanProses,
        biayaOptimasiFormulaDanProses,
        jumlahPenelitianStabilitaSkalaLab,
        kebutuhanStabilitaSkalaLab,
        biayaStabilitaSkalaLab,
        jumlahPenelitianSampelPerTinggal,
        kebutuhanSampelPerTinggal,
        biayaSampelPerTinggal,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        source,
      } = req.body;

      const [updatedRowsCount] = await t_material.update(
        {
          jumlahPenelitianAnalisaMaterial,
          kebutuhanAnalisaMaterial,
          biayaAnalisaMaterial,
          jumlahPenelitianOrientasiFormulaDanProses,
          kebutuhanOrientasiFormulaDanProses,
          biayaOrientasiFormulaDanProses,
          jumlahPenelitianOptimasiFormulaDanProses,
          kebutuhanOptimasiFormulaDanProses,
          biayaOptimasiFormulaDanProses,
          jumlahPenelitianStabilitaSkalaLab,
          kebutuhanStabilitaSkalaLab,
          biayaStabilitaSkalaLab,
          jumlahPenelitianSampelPerTinggal,
          kebutuhanSampelPerTinggal,
          biayaSampelPerTinggal,
          totalKebutuhanMaterial,
          perkiraanHargaPembelianMaterial,
          source,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "material updated successfully",
        });
      } else {
        res.status(404).json({
          message: "material not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createOriginatorAtauKompetitor(req, res, next) {
    try {
      const {
        originator,
        source,
        harga,
        pemeriksaanFisikDanKimiaOriginator,
        profilDisolusi,
        stabilita,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        tableIndex,
        StudiPraformulasiID,
      } = req.body;

      const createOriginatorAtauKompetitor =
        await t_originatorAtauKompetitor.create({
          originator,
          source,
          harga,
          pemeriksaanFisikDanKimiaOriginator,
          profilDisolusi,
          stabilita,
          totalKebutuhanMaterial,
          perkiraanHargaPembelianMaterial,
          tableIndex: +tableIndex,
          StudiPraformulasiID: +StudiPraformulasiID,
        });

      res.status(201).json({
        message: "Success Create originator/kompetitor",
        data: createOriginatorAtauKompetitor,
      });
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editOriginatorKompetitor(req, res, next) {
    const { id } = req.params;
    try {
      const {
        originator,
        source,
        harga,
        pemeriksaanFisikDanKimiaOriginator,
        profilDisolusi,
        stabilita,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
      } = req.body;

      const [updatedRowsCount] = await t_originatorAtauKompetitor.update(
        {
          originator,
          source,
          harga,
          pemeriksaanFisikDanKimiaOriginator,
          profilDisolusi,
          stabilita,
          totalKebutuhanMaterial,
          perkiraanHargaPembelianMaterial,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "originator kompetitor updated successfully",
        });
      } else {
        res.status(404).json({
          message: "originator kompetitor not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKebutuhanPeralatanDanMesin(req, res, next) {
    try {
      const { peralatanDanMesin, fungsi, kapasitas, StudiPraformulasiID } =
        req.body;

      const createKebutuhanPeralatanDanMesin =
        await t_kebutuhanPeralatanDanMesin.create({
          peralatanDanMesin,
          fungsi,
          kapasitas,
          StudiPraformulasiID,
        });

      res.status(201).json({
        message: "Success Kebutuhan Peralatan Dan Mesin",
        data: createKebutuhanPeralatanDanMesin,
      });
    } catch (err) {
      console.error(err);
      next(err);
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
  static async editKebutuhanPeralatan(req, res, next) {
    const { id } = req.params;
    try {
      const { peralatanDanMesin, fungsi, kapasitas } = req.body;

      const [updatedRowsCount] = await t_kebutuhanPeralatanDanMesin.update(
        {
          peralatanDanMesin,
          fungsi,
          kapasitas,
        },
        {
          where: { id: +id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "kebutuhan peralatan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "kebutuhan peralatan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
}

module.exports = ControllerStudiPraformulasi;
