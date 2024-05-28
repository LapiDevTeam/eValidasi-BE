const {
  LaporanTrialSkalaLab,
  AktivitasDanWaktuPencapaian,
  KesimpulanFormulaTerpilih,
  RingkasanHasilStudiCpp,
  KesimpulanProsesTerpilih,
  UsulanPenelitianProduk,
  UpdateRiskAssessment,
  UpdateRiskAssessmentBahanAktif,
  UpdateRiskAssessmentBahanTambahan,
  UpdateRiskAssessmentKemasan,
  sequelize,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const { AsyncLocalStorage } = require("async_hooks");
const { checkStatusProtokol } = require("../helpers/checkStatus");
const {
  getStatusProtokolSkalaLab,
} = require("../helpers/statusProtokolSkalaLab");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");

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

      const studi = await LaporanTrialSkalaLab.findAndCountAll({
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

      await LaporanTrialSkalaLab.destroy({
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

      const existingLaporan = await LaporanTrialSkalaLab.findOne({
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
      const createLaporanTrialSkalaLab = await LaporanTrialSkalaLab.create({
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
      } = req.body;
      const findLaporanTrialSkalaLabID = await LaporanTrialSkalaLab.findByPk(
        +LaporanTrialSkalaLabID
      );

      console.log(findLaporanTrialSkalaLabID, "< IDDDDDDD ");

      if (!findLaporanTrialSkalaLabID) throw { name: "NotFound" };
      const updateDokumenAcuan = await LaporanTrialSkalaLab.update(
        {
          productBriefNo: productBriefNo,
          hasilStudiPraformulasiNo: hasilStudiPraformulasiNo,
          protokolPenelitianNo: protokolPenelitianNo,
          lainlain: lainlain,
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
        await AktivitasDanWaktuPencapaian.create({
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
      const {
        komposisi,
        jumlah,
        apakahAdaPadaKomposisiOriginator,
        justifikasi,
        LaporanTrialSkalaLabID,
      } = req.body;

      const createKesimpulanFormula = await KesimpulanFormulaTerpilih.create({
        komposisi,
        jumlah,
        apakahAdaPadaKomposisiOriginator,
        justifikasi,
        LaporanTrialSkalaLabID,
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
    try {
      const {
        prosesParameter,
        CqaYangDiStudi,
        rangeStudi,
        controlStrategy,
        justifikasi,
        LaporanTrialSkalaLabID,
      } = req.body;

      const createRingkasanHasilStudiCpp = await RingkasanHasilStudiCpp.create({
        prosesParameter,
        CqaYangDiStudi,
        rangeStudi,
        controlStrategy,
        justifikasi,
        LaporanTrialSkalaLabID,
      });

      res.status(201).json({
        message: "Success Create ringkasan hasil studi cpp",
        data: createRingkasanHasilStudiCpp,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createKesimpulanProsesTerpilih(req, res, next) {
    try {
      const { tahapanProses, parameter, justifikasi, LaporanTrialSkalaLabID } =
        req.body;

      const createKesimpulanProsesTerpilih =
        await KesimpulanProsesTerpilih.create({
          tahapanProses,
          parameter,
          justifikasi,
          LaporanTrialSkalaLabID,
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
        usulanSkalaPilot,
        justifikasi,
        LaporanTrialSkalaLabID,
      } = req.body;

      const createUsulanPenelitianProduk = await UsulanPenelitianProduk.create({
        faktor,
        parameter,
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

      const createUpdateAssessment = await UpdateRiskAssessment.create({
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
        await UpdateRiskAssessmentBahanAktif.create({
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
        await UpdateRiskAssessmentBahanTambahan.create({
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

      const createUpdateAssessment = await UpdateRiskAssessmentKemasan.create({
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
  static async getLaporanTrialSkalaLabDetails(req, res, next) {
    try {
      const { id } = req.params;
      const laporanTrialSkalaLabDetails = await LaporanTrialSkalaLab.findOne({
        where: {
          id,
          // bagian: bagian_user,
        },
      });
      const aktivitasDanWaktuPencapaian =
        await AktivitasDanWaktuPencapaian.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const kesimpulanFormulaTerpilih = await KesimpulanFormulaTerpilih.findAll(
        {
          where: {
            LaporanTrialSkalaLabID: id,
          },
        }
      );
      const kesimpulanProsesTerpilih = await KesimpulanProsesTerpilih.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const ringkasanHasilStudiCpp = await RingkasanHasilStudiCpp.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const usulanPenelitianProduk = await UsulanPenelitianProduk.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const updateRiskAssessment = await UpdateRiskAssessment.findOne({
        where: {
          LaporanTrialSkalaLabID: id,
        },
      });
      const updateRiskAssessmentBahanAktif =
        await UpdateRiskAssessmentBahanAktif.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const updateRiskAssessmentBahanTambahan =
        await UpdateRiskAssessmentBahanTambahan.findOne({
          where: {
            LaporanTrialSkalaLabID: id,
          },
        });
      const updateRiskAssessmentKemasan =
        await UpdateRiskAssessmentKemasan.findOne({
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
        kesimpulanFormulaTerpilih,
        ringkasanHasilStudiCpp,
        kesimpulanFormulaTerpilih,
        kesimpulanProsesTerpilih,
        usulanPenelitianProduk,
        updateRiskAssessment,
        updateRiskAssessmentBahanAktif,
        updateRiskAssessmentBahanTambahan,
        updateRiskAssessmentKemasan,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
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

      const proto = await LaporanTrialSkalaLab.findByPk(+id);
      // const protoNo = studi.addendumKe;
      // console.log(studiNo, "<<<<<<<<<<<<<<<<<< STUDI");

      const [updatedRowsCount] = await LaporanTrialSkalaLab.update(
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
  static async editAktivitasDanWaktuPencapaian(req, res, next) {
    const { id } = req.params;
    try {
      const {
        rencanaTersediaBahanAwal,
        pencapaianTersediaBahanAwal,
        rencanaOptimasiFormula,
        pencapaianOptimasiFormula,
        rencanaStabilitaSkalaLab,
        pencapaianStabilitaSkalaLab,
        // LaporanTrialSkalaLabID,
      } = req.body;

      const [updatedRowsCount] = await AktivitasDanWaktuPencapaian.update(
        {
          rencanaTersediaBahanAwal,
          pencapaianTersediaBahanAwal,
          rencanaOptimasiFormula,
          pencapaianOptimasiFormula,
          rencanaStabilitaSkalaLab,
          pencapaianStabilitaSkalaLab,
          // LaporanTrialSkalaLabID,
        },
        {
          where: { LaporanTrialSkalaLabID: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "aktivitas dan waktu pencapaian updated successfully",
        });
      } else {
        res.status(404).json({
          message: "aktivitas dan waktu pencapaian not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }

  static async editKesimpulanFormulaTerpilih(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const {
        komposisi,
        jumlah,
        apakahAdaPadaKomposisiOriginator,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await KesimpulanFormulaTerpilih.update(
        {
          komposisi: komposisi || "",
          jumlah: jumlah || "",
          apakahAdaPadaKomposisiOriginator:
            apakahAdaPadaKomposisiOriginator || "",
          justifikasi: justifikasi || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "kesimpulanFormulaTerpilih updated successfully",
        });
      } else {
        res.status(404).json({
          message: "kesimpulanFormulaTerpilih not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async deleteKesimpulanFormulaTerpilih(req, res) {
    try {
      const { id } = req.params;

      const kesimpulanFormula = await KesimpulanFormulaTerpilih.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (kesimpulanFormula.length > 0) {
        await KesimpulanFormulaTerpilih.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteBahanAktif(req, res) {
    try {
      const { id } = req.params;

      const bahanAktif = await UpdateRiskAssessmentBahanAktif.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (bahanAktif.length > 0) {
        await UpdateRiskAssessmentBahanAktif.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteBahanTambahan(req, res) {
    try {
      const { id } = req.params;

      const bahanTambahan = await UpdateRiskAssessmentBahanTambahan.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (bahanTambahan.length > 0) {
        await UpdateRiskAssessmentBahanTambahan.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteBahanKemasan(req, res) {
    try {
      const { id } = req.params;

      const bahanKemasan = await UpdateRiskAssessmentKemasan.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (bahanKemasan.length > 0) {
        await UpdateRiskAssessmentKemasan.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteRingkasanCpp(req, res) {
    try {
      const { id } = req.params;

      const ringkasanCpp = await RingkasanHasilStudiCpp.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (ringkasanCpp.length > 0) {
        await RingkasanHasilStudiCpp.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteKesimpulanProses(req, res) {
    try {
      const { id } = req.params;

      const kesimpulanProses = await KesimpulanProsesTerpilih.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (kesimpulanProses.length > 0) {
        await KesimpulanProsesTerpilih.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteUpdateRisk(req, res) {
    try {
      const { id } = req.params;

      const updateRisk = await UpdateRiskAssessment.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (updateRisk.length > 0) {
        await UpdateRiskAssessment.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async deleteUsulan(req, res) {
    try {
      const { id } = req.params;

      const usulan = await UsulanPenelitianProduk.findAll({
        where: { LaporanTrialSkalaLabID: +id },
      });

      if (usulan.length > 0) {
        await UsulanPenelitianProduk.destroy({
          where: { LaporanTrialSkalaLabID: +id }, // Corrected the where clause
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
  static async editUsulan(req, res) {
    try {
      const { data } = req.body;
      const { id } = req.params;
      const transaction = await sequelize.transaction();

      const prevUsulan = await UsulanPenelitianProduk.findAll({
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
            const created = await UsulanPenelitianProduk.create(
              {
                faktor: newItem?.faktor || "",
                parameter: newItem?.parameter || "",
                usulanSkalaPilot: newItem?.usulanSkalaPilot || "",
                justifikasi: newItem?.justifikasi || "",
                LaporanTrialSkalaLabID: newItem?.LaporanTrialSkalaLabID || null,
              },
              { transaction }
            );
            return created?.id;
          }
          // update
          else if (newItem?.id && existing?.includes(+newItem?.id)) {
            await UsulanPenelitianProduk.update(
              {
                faktor: newItem?.faktor || "",
                parameter: newItem?.parameter || "",
                usulanSkalaPilot: newItem?.usulanSkalaPilot || "",
                justifikasi: newItem?.justifikasi || "",
                LaporanTrialSkalaLabID: newItem?.LaporanTrialSkalaLabID || null,
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
        await UsulanPenelitianProduk.destroy({
          where: { id: { [Op.in]: itemDelete } },
          transaction,
        });
      }

      await transaction.commit();

      const newData = await UsulanPenelitianProduk.findAll({
        where: {
          LaporanTrialSkalaLabID: id,
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
}

module.exports = ControllerLaporanTrialSkalaLab;
