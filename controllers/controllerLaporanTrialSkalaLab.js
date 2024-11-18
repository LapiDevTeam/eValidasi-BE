const {
  t_laporanTrialSkalaLab,
  t_aktivitasDanWaktuPencapaian,
  t_kesimpulanFormulaTerpilih,
  t_ringkasanHasilStudiCpp,
  t_kesimpulanProsesTerpilih,
  t_usulanPenelitianProduk,
  t_updateRiskAssessment,
  t_updateRiskAssessmentBahanAktif,
  t_updateRiskAssessmentBahanTambahan,
  t_updateRiskAssessmentKemasan,
  t_ringkasanHasilStudiCma,
  t_laporanTrialSkalaLab_status,
  t_LTS_studiScreeningSourceApi,
  t_LTS_kriteriaPenerimaan,
  t_LTS_studiCppTerhadapCqa,
  t_LTS_bahanAktifCma,
  t_LTS_bahanTambahanCma,
  t_LTS_hasilDanPembahasanOrientasi,
  sequelize,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");

const {
  checkStatusProtokol,
  checkStatusLaporanTrialSkalaLab,
} = require("../helpers/checkStatus");
const {
  getStatusProtokolSkalaLab,
} = require("../helpers/statusProtokolSkalaLab");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");
const {
  getStatusLaporanTrialSkalaLab,
} = require("../helpers/statusLaporanTrialSkalaLab");

class ControllerLaporanTrialSkalaLab {
  static async findAllLaporanTrialSkalaLab(req, res) {
    try {
      const { page, nomor, tanggal, namaProduk, komposisi, alasan, tujuan } =
        req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (nomor) searchParams.nomor = { [Op.iLike]: `%${nomor}%` };
      if (tanggal)
        searchParams.tanggal = {
          [Op.iLike]: `%${tanggal}%`,
        };
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (komposisi) searchParams.komposisi = { [Op.iLike]: `%${komposisi}%` };
      if (alasan)
        searchParams.alasan = {
          [Op.iLike]: `%${alasan}%`,
        };
      if (tujuan)
        searchParams.tujuan = {
          [Op.iLike]: `%${tujuan}%`,
        };

      const studi = await t_laporanTrialSkalaLab.findAndCountAll({
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
      console.log(err, 12312312);
    }
  }

  static async deleteLaporanTrialSkalaLab(req, res) {
    try {
      const { id } = req.params;

      await t_laporanTrialSkalaLab.destroy({
        where: { id: id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }

  static async createLaporanTrialSkalaLab(req, res, next) {
    // console.log("MASUKK PAK EKO");
    const { nama_user, bagian_user } = req.user;
    try {
      const {
        nomor,
        tanggal,
        revisi,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        hasilStudiPraformulasiNo,
        lainlain,
        ProductBriefId,
        status,
        rdSelection,
      } = req.body;

      console.log(namaProduk, " NAMAPRODUK");

      const existingLaporan = await t_laporanTrialSkalaLab.findOne({
        where: {
          namaProduk: namaProduk,
        },
        order: [["createdAt", "DESC"]],
      });

      let newRevisi;

      // console.log(existingLaporan.dataValues.status, "exis 12312312");
      if (
        existingLaporan &&
        existingLaporan?.dataValues?.status === "Approved"
      ) {
        newRevisi = existingLaporan?.revisi + 1;
      } else if (
        existingLaporan &&
        existingLaporan?.dataValues?.status !== "Approved"
      ) {
        throw new MyError(
          404,
          "Product masih Draft, menunggu status menjadi approved"
        );
      } else {
        newRevisi = 0;
      }

      // const newRevisi = existingLaporan.revisi + 1;
      const createLaporanTrialSkalaLab = await t_laporanTrialSkalaLab.create({
        nomor,
        tanggal,
        revisi: newRevisi,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        hasilStudiPraformulasiNo,
        lainlain,
        ProductBriefId,
        status,
        rdSelection,
        pic: nama_user || "",
        bagian: bagian_user || "",
      });

      res.status(201).json({
        message: "Success Create Laporan Trial Skala Lab with Revised Revisi",
        data: createLaporanTrialSkalaLab,
      });
      // } else if (existingProtokol.dataValues.status != "Approved") {
      //   throw new MyError(
      //     404,
      //     "Product masih Draft, menunggu status menjadi approved"
      //   );
      // }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async updateDokumenAcuanLaporan(req, res) {
    try {
      const { LaporanTrialSkalaLabID } = req.params;

      const {
        productBriefNo,
        hasilStudiPraformulasiNo,
        protokolPenelitianNo,
        lainlain,
        permasalahan,
        tujuan,
        skalaStudi,
        penyimpanganSampel,
        tahapanStudi,
        pembahasan,
        kesimpulan,
        tindakLanjut,
      } = req.body;
      const findLaporanTrialSkalaLabID = await t_laporanTrialSkalaLab.findByPk(
        +LaporanTrialSkalaLabID
      );

      console.log(findLaporanTrialSkalaLabID, "< IDDDDDDD ");

      if (!findLaporanTrialSkalaLabID) throw { name: "NotFound" };
      const updateDokumenAcuan = await t_laporanTrialSkalaLab.update(
        {
          productBriefNo: productBriefNo,
          hasilStudiPraformulasiNo: hasilStudiPraformulasiNo,
          protokolPenelitianNo: protokolPenelitianNo,
          lainlain: lainlain,
          permasalahan: permasalahan,
          tujuan: tujuan,
          skalaStudi: skalaStudi,
          penyimpanganSampel: penyimpanganSampel,
          tahapanStudi: tahapanStudi,
          pembahasan: pembahasan,
          kesimpulan: kesimpulan,
          tindakLanjut: tindakLanjut,
        },
        {
          where: {
            id: findLaporanTrialSkalaLabID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateDokumenAcuan);
    } catch (err) {
      console.log(err);
    }
  }

  static async createAktivitasDanWaktuPencapaian(req, res, next) {
    try {
      const {
        rencanaTersediaBahanAwal,
        pencapaianTersediaBahanAwal,
        rencanaOptimasiFormula,
        pencapaianOptimasiFormula,
        rencanaStabilitaSkalaLab,
        pencapaianStabilitaSkalaLab,
        LaporanTrialSkalaLabID,
      } = req.body;

      const createAktivitasDanWaktuPencapaian =
        await t_aktivitasDanWaktuPencapaian.create({
          rencanaTersediaBahanAwal,
          pencapaianTersediaBahanAwal,
          rencanaOptimasiFormula,
          pencapaianOptimasiFormula,
          rencanaStabilitaSkalaLab,
          pencapaianStabilitaSkalaLab,
          LaporanTrialSkalaLabID,
        });

      res.status(201).json({
        message: "Success create aktivitas dan waktu pencapaian",
        data: createAktivitasDanWaktuPencapaian,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async createKesimpulanFormula(req, res, next) {
    try {
      const { kesimpulanFormulaTerpilih, LaporanTrialSkalaLabID } = req.body;
      const { id } = req.params;
      const createKesimpulanFormula = await t_kesimpulanFormulaTerpilih.create({
        kesimpulanFormulaTerpilih,
        LaporanTrialSkalaLabID: +id || null,
      });

      res.status(201).json({
        message: "Success Create kesimpulan formula",
        data: createKesimpulanFormula,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createRingkasanHasilStudiCpp(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;

      await Promise.all(
        data?.map(async (newItem) => {
          const createCMA = await t_ringkasanHasilStudiCpp.create(
            {
              title: newItem?.title || "",
              content: newItem?.content || [],
              LaporanTrialSkalaLabID: +id || null,
            },
            { transaction }
          );
          return createCMA?.id;
        })
      );

      await transaction.commit();

      const newData = await t_ringkasanHasilStudiCpp.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async createRingkasanHasilStudiCma(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;

      await Promise.all(
        data?.map(async (newItem) => {
          const createCMA = await t_ringkasanHasilStudiCma.create(
            {
              title: newItem?.title || "",
              content: newItem?.content || [],
              LaporanTrialSkalaLabID: +id || null,
            },
            { transaction }
          );
          return createCMA?.id;
        })
      );

      await transaction.commit();

      const newData = await t_ringkasanHasilStudiCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: newData,
      });
    } catch (err) {
      console.log(err);
      if (transaction) {
        await transaction.rollback();
      }
    }
  }
  static async createKesimpulanProsesTerpilih(req, res, next) {
    try {
      const { kesimpulanProsesTerpilih, LaporanTrialSkalaLabID } = req.body;
      const { id } = req.params;
      const createKesimpulanProsesTerpilih =
        await t_kesimpulanProsesTerpilih.create({
          kesimpulanProsesTerpilih,
          LaporanTrialSkalaLabID: +id || null,
        });

      res.status(201).json({
        message: "Success Create kesimpulan proses terpilih",
        data: createKesimpulanProsesTerpilih,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUsulanPenelitianProduk(req, res, next) {
    try {
      const {
        faktor,
        parameter,
        rangeStudiSkalaLab,
        usulanSkalaPilot,
        justifikasi,
        LaporanTrialSkalaLabID,
      } = req.body;

      const createUsulanPenelitianProduk =
        await t_usulanPenelitianProduk.create({
          faktor,
          parameter,
          rangeStudiSkalaLab,
          usulanSkalaPilot,
          justifikasi,
          LaporanTrialSkalaLabID,
        });

      res.status(201).json({
        message: "Success Create usulan penelitian produk",
        data: createUsulanPenelitianProduk,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUpdateAssessment(req, res, next) {
    try {
      const { cqaHeader, rows, LaporanTrialSkalaLabID } = req.body;

      const createUpdateAssessment = await t_updateRiskAssessment.create({
        cqaHeader: cqaHeader,
        rows: rows,
        LaporanTrialSkalaLabID,
      });

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: createUpdateAssessment,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUpdateAssessmentBahanAktif(req, res, next) {
    try {
      const { cqaHeader, rows, LaporanTrialSkalaLabID } = req.body;

      const createUpdateAssessment =
        await t_updateRiskAssessmentBahanAktif.create({
          cqaHeader: cqaHeader,
          rows: rows,
          LaporanTrialSkalaLabID,
        });

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: createUpdateAssessment,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUpdateAssessmentBahanTambahan(req, res, next) {
    try {
      const { cqaHeader, rows, LaporanTrialSkalaLabID } = req.body;

      const createUpdateAssessment =
        await t_updateRiskAssessmentBahanTambahan.create({
          cqaHeader: cqaHeader,
          rows: rows,
          LaporanTrialSkalaLabID,
        });

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: createUpdateAssessment,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createUpdateAssessmentKemasan(req, res, next) {
    try {
      const { cqaHeader, rows, LaporanTrialSkalaLabID } = req.body;

      const createUpdateAssessment = await t_updateRiskAssessmentKemasan.create(
        {
          cqaHeader: cqaHeader,
          rows: rows,
          LaporanTrialSkalaLabID,
        }
      );

      res.status(201).json({
        message: "Success createUpdateAssessment",
        data: createUpdateAssessment,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getLaporanTrialSkalaLabDetails(req, res, next) {
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      const { id } = req.params;

      let laporanTrialSkalaLabDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        console.log(id, "<< id");
        laporanTrialSkalaLabDetails = await t_laporanTrialSkalaLab?.findOne({
          where: {
            id,
          },
          include: {
            model: t_laporanTrialSkalaLab_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_laporanTrialSkalaLab_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
        console.log(laporanTrialSkalaLabDetails, "<< detil");
      } else {
        console.log("test");
        laporanTrialSkalaLabDetails = await t_laporanTrialSkalaLab.findOne({
          where: {
            id,
            bagian: bagian_user,
          },
          include: {
            model: t_laporanTrialSkalaLab_status,
            as: "approver_data",
          },
          order: [
            [
              { model: t_laporanTrialSkalaLab_status, as: "approver_data" },
              "approver_no",
              "ASC",
            ],
          ],
        });
      }
      console.log(laporanTrialSkalaLabDetails, "<<< DETAILS");
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = laporanTrialSkalaLabDetails.bagian;
      const apprNo = await checkStatusLaporanTrialSkalaLab(id);
      console.log(apprNo, "< < DEBt ID");
      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "laporanTrialSkalaLab",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );
      console.log(isApprove, "<< asdasda");
      if (isApprove.message) throw new MyError(400, isApprove.message);

      // res
      //   .status(200)
      //   .json({
      //     ...(laporanTrialSkalaLabDetails?.dataValues || {}),
      //     isApprove,
      //   });

      const aktivitasDanWaktuPencapaian =
        await t_aktivitasDanWaktuPencapaian.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const kesimpulanFormulaTerpilih =
        await t_kesimpulanFormulaTerpilih.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const kesimpulanProsesTerpilih = await t_kesimpulanProsesTerpilih.findOne(
        {
          where: {
            LaporanTrialSkalaLabID: id,
          },
        }
      );
      const ringkasanHasilStudiCpp = await t_ringkasanHasilStudiCpp.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const ringkasanHasilStudiCma = await t_ringkasanHasilStudiCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });

      const usulanPenelitianProduk = await t_usulanPenelitianProduk.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const studiCppTerhadapCqa = await t_LTS_studiCppTerhadapCqa.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const hasilDanPembahasanOrientasi =
        await t_LTS_hasilDanPembahasanOrientasi.findAll({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const bahanAktifCma = await t_LTS_bahanAktifCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const bahanTambahanCma = await t_LTS_bahanTambahanCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const kriteriaPenerimaan = await t_LTS_kriteriaPenerimaan.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const updateRiskAssessment = await t_updateRiskAssessment.findOne({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const updateRiskAssessmentBahanAktif =
        await t_updateRiskAssessmentBahanAktif.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const updateRiskAssessmentBahanTambahan =
        await t_updateRiskAssessmentBahanTambahan.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const updateRiskAssessmentKemasan =
        await t_updateRiskAssessmentKemasan.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      if (!laporanTrialSkalaLabDetails) {
        return res.status(404).json({ message: "Laporan not found" });
      }
      res.status(200).json({
        laporanTrialSkalaLabDetails,
        aktivitasDanWaktuPencapaian,
        kriteriaPenerimaan,
        kesimpulanFormulaTerpilih,
        ringkasanHasilStudiCpp,
        ringkasanHasilStudiCma,
        kesimpulanFormulaTerpilih,
        kesimpulanProsesTerpilih,
        usulanPenelitianProduk,
        studiCppTerhadapCqa,
        hasilDanPembahasanOrientasi,
        bahanAktifCma,
        bahanTambahanCma,
        updateRiskAssessment,
        updateRiskAssessmentBahanAktif,
        updateRiskAssessmentBahanTambahan,
        updateRiskAssessmentKemasan,
        ...(laporanTrialSkalaLabDetails?.dataValues || {}),
        isApprove,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  static async updateUploadAktivitas(req, res) {
    try {
      console.log("xixixixixi");

      const { LaporanTrialSkalaLabID } = req.params;
      const cat = await t_laporanTrialSkalaLab.findByPk(
        +LaporanTrialSkalaLabID
      );
      // if (cat?.statusDokumen === "Reject") {
      //   await t_laporanTrialSkalaLab_status.destroy({
      //     where: { CatatanTrialID: +CatatanTrialID },
      //   });
      //   await t_laporanTrialSkalaLab.update(
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

      const findLaporanTrialSkalaLabID = await t_laporanTrialSkalaLab.findByPk(
        +LaporanTrialSkalaLabID
      );

      console.log(findLaporanTrialSkalaLabID.id, "< ID");

      if (!findLaporanTrialSkalaLabID) throw { name: "NotFound" };
      const updateUpload = await t_laporanTrialSkalaLab.update(
        { upload }, // Directly using upload array
        {
          where: { id: findLaporanTrialSkalaLabID.id },
          returning: true,
        }
      );
      console.log(updateUpload, "<< update");

      res.status(200).json(updateUpload);
    } catch (err) {
      console.log(err);
    }
  }
  static async editLaporanTrialSkalaLab(req, res, next) {
    const { id } = req.params;
    try {
      const {
        nomor,
        tanggal,
        revisi,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        hasilStudiPraformulasiNo,
        lainlain,
        ProductBriefId,
        status,
        rdSelection,
      } = req.body;

      const obj = {};

      if (nomor) {
        obj.nomor = nomor;
      }
      if (tanggal) {
        obj.tanggal = tanggal;
      }
      if (revisi) {
        obj.revisi = revisi;
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

      if (hasilStudiPraformulasiNo) {
        obj.hasilStudiPraformulasiNo = hasilStudiPraformulasiNo;
      }
      if (lainlain) {
        obj.lainlain = lainlain;
      }
      if (ProductBriefId) {
        obj.ProductBriefId = ProductBriefId;
      }
      if (status) {
        obj.status = status;
      }
      if (rdSelection) {
        obj.rdSelection = rdSelection;
      }

      const proto = await t_laporanTrialSkalaLab.findByPk(+id);
      // const protoNo = studi.addendumKe;
      // console.log(studiNo, "<<<<<<<<<<<<<<<<<< STUDI");

      const [updatedRowsCount] = await t_laporanTrialSkalaLab.update(
        {
          ...obj,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "laporan trial skala lab updated successfully",
        });
      } else {
        res.status(404).json({
          message: "laporan trial skala lab not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editUsulan(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { data } = req.body;
      const { id } = req.params;

      console.log(id, "<<<<<");

      const prevUsulan = await t_usulanPenelitianProduk.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });

      const existing = prevUsulan.map((item) => item?.id);
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
            const created = await t_usulanPenelitianProduk.create(
              {
                faktor: newItem?.faktor || "",
                parameter: newItem?.parameter || "",
                rangeStudiSkalaLab: newItem?.rangeStudiSkalaLab || "",
                usulanSkalaPilot: newItem?.usulanSkalaPilot || "",
                justifikasi: newItem?.justifikasi || "",
                LaporanTrialSkalaLabID: +id || null,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_usulanPenelitianProduk.update(
              {
                faktor: newItem?.faktor || "",
                parameter: newItem?.parameter || "",
                rangeStudiSkalaLab: newItem?.rangeStudiSkalaLab || "",
                usulanSkalaPilot: newItem?.usulanSkalaPilot || "",
                justifikasi: newItem?.justifikasi || "",
                LaporanTrialSkalaLabID: +id || null,
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
        await t_usulanPenelitianProduk.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_usulanPenelitianProduk.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async approveLaporanTrialSkalaLab(req, res, next) {
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
      const findLaporanTrialSkalaLab = await t_laporanTrialSkalaLab.findByPk(
        +id
      );
      if (!findLaporanTrialSkalaLab)
        throw new MyError(404, "Form laporan trial skala lab tidak ditemukan");
      const apprNo = await checkStatusLaporanTrialSkalaLab(id);

      const dataApprove = await approverRecordset(
        // findProtokol.nama_pegawai,
        "laporanTrialSkalaLab",
        findLaporanTrialSkalaLab.bagian,
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
        status = getStatusLaporanTrialSkalaLab(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) status = "Approved";
      if (is_approve === false) {
        status = "Reject";
        await t_laporanTrialSkalaLab_status.destroy({
          where: { LaporanTrialSkalaLabID: +id },
        });
      }

      console.log(status, "<< STAUTS");
      console.log(dataApprove.recordset[0]?.Appr_DefinitionID, "<< record set");

      console.log(is_approve, "<<< iNI IS APPROVE");

      await t_laporanTrialSkalaLab_status.create({
        LaporanTrialSkalaLabID: id,
        approver_no: apprNo,
        is_approve,
        approver_inisial: inisial_user,
        approver_name: nama_user,
        approver_joblevel_id: joblevel_id_user,
        keterangan_reject,
        user_id,
        delegated_to,
      });
      await t_laporanTrialSkalaLab.update(
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
  static async createPermasalahan(req, res, next) {
    try {
      const { permasalahan, LaporanTrialSkalaLabID } = req.body;

      const createPermasalahan = await t_LTS_studiScreeningSourceApi.create({
        permasalahan: permasalahan,
        LaporanTrialSkalaLabID,
      });

      res.status(201).json({
        message: "Success createPermasalahan",
        data: createPermasalahan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async handleSaveKriteriaPenerimaan(req, res) {
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

      // const cat = await t_catatanTrial.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { LaporanTrialSkalaLabID: +id },
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

      const prevKriteria = await t_LTS_kriteriaPenerimaan.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKriteria.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_LTS_kriteriaPenerimaan.create(
              {
                parameter: newItem?.parameter || "",
                spesifikasi: newItem?.spesifikasi || "",
                referensi: newItem?.referensi || "",
                tableIndex: newItem?.tableIndex ?? null,
                LaporanTrialSkalaLabID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_LTS_kriteriaPenerimaan.update(
              {
                kodeTrial: newItem?.kodeTrial || "",
                aktivitas: newItem?.aktivitas || "",
                pengamatan: newItem?.pengamatan || "",
                tableIndex: newItem?.tableIndex ?? null,
                LaporanTrialSkalaLabID: +id || null,
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
        await t_LTS_kriteriaPenerimaan.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_LTS_kriteriaPenerimaan.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_LTS_kriteriaPenerimaan.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async handleSaveStudiCppTerhadapCqa(req, res) {
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

      // const cat = await t_catatanTrial.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { LaporanTrialSkalaLabID: +id },
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

      const prevKriteria = await t_LTS_studiCppTerhadapCqa.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKriteria.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_LTS_studiCppTerhadapCqa.create(
              {
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_LTS_studiCppTerhadapCqa.update(
              {
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
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
        await t_LTS_studiCppTerhadapCqa.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_LTS_studiCppTerhadapCqa.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_LTS_studiCppTerhadapCqa.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async updateUpload(req, res) {
    try {
      console.log("Starting updateUpload...");

      const { LaporanTrialSkalaLabID } = req.params;
      const uploads = req.body; // Expected to be an array of objects

      console.log(uploads, "< Upload Data");

      // Ensure uploads is an array
      if (!Array.isArray(uploads) || uploads.length === 0) {
        return res.status(400).json({ message: "Invalid upload data format" });
      }

      // Check if records with the specified LaporanTrialSkalaLabID exist
      const findRecords = await t_LTS_studiCppTerhadapCqa.findAll({
        where: { LaporanTrialSkalaLabID: +LaporanTrialSkalaLabID },
      });

      if (!findRecords.length) {
        throw {
          name: "NotFound",
          message: "No records found with the given LaporanTrialSkalaLabID",
        };
      }

      // Update each record based on the data provided in uploads
      const updatePromises = uploads.map(async (uploadData) => {
        const { id, upload } = uploadData;

        // Validate that each item has an id and upload property
        if (!id || !upload) {
          throw new Error(
            "Each upload data item must contain 'id' and 'upload' properties."
          );
        }

        // Update the specific record by id
        return await t_LTS_studiCppTerhadapCqa.update(
          { upload },
          {
            where: { id },
            returning: true,
          }
        );
      });

      // Execute all update promises
      const updatedRecords = await Promise.all(updatePromises);
      console.log(updatedRecords, "<< Updated Records");

      res
        .status(200)
        .json({ message: "Uploads updated successfully", updatedRecords });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || "An error occurred during the upload update.",
      });
    }
  }
  static async getStudiCppTerhadapCqa(req, res, next) {
    try {
      const { id } = req.params;

      const studiCppTerhadapCqa = await t_LTS_studiCppTerhadapCqa.findAll({
        where: { LaporanTrialSkalaLabID: id },
        order: [["id", "ASC"]],
      });

      res.status(200).json({
        studiCppTerhadapCqa,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async handleSaveBahanAktifCma(req, res) {
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

      // const cat = await t_catatanTrial.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { LaporanTrialSkalaLabID: +id },
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

      const prevKriteria = await t_LTS_bahanAktifCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKriteria.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_LTS_bahanAktifCma.create(
              {
                namaBahan: newItem?.namaBahan || "",
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_LTS_bahanAktifCma.update(
              {
                namaBahan: newItem?.namaBahan || "",
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
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
        await t_LTS_bahanAktifCma.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_LTS_bahanAktifCma.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_LTS_bahanAktifCma.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async updateUploadBahanAktifCma(req, res) {
    try {
      console.log("Starting updateUpload...");

      const { LaporanTrialSkalaLabID } = req.params;
      const uploads = req.body; // Expected to be an array of objects

      console.log(uploads, "< Upload Data");

      // Ensure uploads is an array
      if (!Array.isArray(uploads) || uploads.length === 0) {
        return res.status(400).json({ message: "Invalid upload data format" });
      }

      // Check if records with the specified LaporanTrialSkalaLabID exist
      const findRecords = await t_LTS_bahanAktifCma.findAll({
        where: { LaporanTrialSkalaLabID: +LaporanTrialSkalaLabID },
      });

      if (!findRecords.length) {
        throw {
          name: "NotFound",
          message: "No records found with the given LaporanTrialSkalaLabID",
        };
      }

      // Update each record based on the data provided in uploads
      const updatePromises = uploads.map(async (uploadData) => {
        const { id, upload } = uploadData;

        // Validate that each item has an id and upload property
        if (!id || !upload) {
          throw new Error(
            "Each upload data item must contain 'id' and 'upload' properties."
          );
        }

        // Update the specific record by id
        return await t_LTS_bahanAktifCma.update(
          { upload },
          {
            where: { id },
            returning: true,
          }
        );
      });

      // Execute all update promises
      const updatedRecords = await Promise.all(updatePromises);
      console.log(updatedRecords, "<< Updated Records");

      res
        .status(200)
        .json({ message: "Uploads updated successfully", updatedRecords });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || "An error occurred during the upload update.",
      });
    }
  }
  static async handleSaveBahanTambahanCma(req, res) {
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

      // const cat = await t_catatanTrial.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { LaporanTrialSkalaLabID: +id },
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

      const prevKriteria = await t_LTS_bahanTambahanCma.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKriteria.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_LTS_bahanTambahanCma.create(
              {
                namaBahan: newItem?.namaBahan || "",
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_LTS_bahanTambahanCma.update(
              {
                namaBahan: newItem?.namaBahan || "",
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
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
        await t_LTS_bahanTambahanCma.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_LTS_bahanTambahanCma.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_LTS_bahanTambahanCma.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async updateUploadBahanTambahanCma(req, res) {
    try {
      console.log("Starting updateUpload...");

      const { LaporanTrialSkalaLabID } = req.params;
      const uploads = req.body; // Expected to be an array of objects

      console.log(uploads, "< Upload Data");

      // Ensure uploads is an array
      if (!Array.isArray(uploads) || uploads.length === 0) {
        return res.status(400).json({ message: "Invalid upload data format" });
      }

      // Check if records with the specified LaporanTrialSkalaLabID exist
      const findRecords = await t_LTS_bahanTambahanCma.findAll({
        where: { LaporanTrialSkalaLabID: +LaporanTrialSkalaLabID },
      });

      if (!findRecords.length) {
        throw {
          name: "NotFound",
          message: "No records found with the given LaporanTrialSkalaLabID",
        };
      }

      // Update each record based on the data provided in uploads
      const updatePromises = uploads.map(async (uploadData) => {
        const { id, upload } = uploadData;

        // Validate that each item has an id and upload property
        if (!id || !upload) {
          throw new Error(
            "Each upload data item must contain 'id' and 'upload' properties."
          );
        }

        // Update the specific record by id
        return await t_LTS_bahanTambahanCma.update(
          { upload },
          {
            where: { id },
            returning: true,
          }
        );
      });

      // Execute all update promises
      const updatedRecords = await Promise.all(updatePromises);
      console.log(updatedRecords, "<< Updated Records");

      res
        .status(200)
        .json({ message: "Uploads updated successfully", updatedRecords });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || "An error occurred during the upload update.",
      });
    }
  }
  static async handleSaveHasilDanPembahasanOrientasi(req, res) {
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

      // const cat = await t_catatanTrial.findByPk(+id);
      // if (cat?.statusDokumen === "Reject") {
      //   await t_catatanTrial_status.destroy({
      //     where: { LaporanTrialSkalaLabID: +id },
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

      const prevKriteria = await t_LTS_hasilDanPembahasanOrientasi.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
        order: [["id", "ASC"]],
      });

      const existing = prevKriteria.map((item) => item?.id);
      const newItemId = data
        .flat()
        .map((item) => item.id)
        .filter((id) => id !== undefined);

      // update
      const dataArray = data.flat();
      await Promise.all(
        dataArray?.map(async (newItem) => {
          //cek kalo gada id , create baru
          console.log(newItem, "< idnem");

          if (!newItem?.id) {
            const created = await t_LTS_hasilDanPembahasanOrientasi.create(
              {
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
                user_id,
                delegated_to,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await t_LTS_hasilDanPembahasanOrientasi.update(
              {
                judul: newItem?.judul || "",
                content: newItem?.content || "",
                upload: newItem?.upload || null,
                LaporanTrialSkalaLabID: +id || null,
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
        await t_LTS_hasilDanPembahasanOrientasi.update(
          {
            user_id,
            delegated_to,
            flag_update,
          },
          { where: { id: { [Op.in]: itemDelete } }, transaction }
        );
        await t_LTS_hasilDanPembahasanOrientasi.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await t_LTS_hasilDanPembahasanOrientasi.findAll({
        where: {
          LaporanTrialSkalaLabID: +id,
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
  static async updateUploadHasilDanPembahasanOrientasi(req, res) {
    try {
      console.log("Starting updateUpload...");

      const { LaporanTrialSkalaLabID } = req.params;
      const uploads = req.body; // Expected to be an array of objects

      console.log(uploads, "< Upload Data");

      // Ensure uploads is an array
      if (!Array.isArray(uploads) || uploads.length === 0) {
        return res.status(400).json({ message: "Invalid upload data format" });
      }

      // Check if records with the specified LaporanTrialSkalaLabID exist
      const findRecords = await t_LTS_hasilDanPembahasanOrientasi.findAll({
        where: { LaporanTrialSkalaLabID: +LaporanTrialSkalaLabID },
      });

      if (!findRecords.length) {
        throw {
          name: "NotFound",
          message: "No records found with the given LaporanTrialSkalaLabID",
        };
      }

      // Update each record based on the data provided in uploads
      const updatePromises = uploads.map(async (uploadData) => {
        const { id, upload } = uploadData;

        // Validate that each item has an id and upload property
        if (!id || !upload) {
          throw new Error(
            "Each upload data item must contain 'id' and 'upload' properties."
          );
        }

        // Update the specific record by id
        return await t_LTS_hasilDanPembahasanOrientasi.update(
          { upload },
          {
            where: { id },
            returning: true,
          }
        );
      });

      // Execute all update promises
      const updatedRecords = await Promise.all(updatePromises);
      console.log(updatedRecords, "<< Updated Records");

      res
        .status(200)
        .json({ message: "Uploads updated successfully", updatedRecords });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || "An error occurred during the upload update.",
      });
    }
  }
}

module.exports = ControllerLaporanTrialSkalaLab;
