const {
  ProtokolTrialSkalaLab,
  Cqa,
  FormulaProtokol,
  ProsesPembuatan,
  Cpp,
  RencanaAktivitas,
  OriginatorAtauKompetitor,
  KebutuhanPeralatanDanMesin,
  Material,
  ZatAktif,
  BahanTambahan,
  KemasanPrimer,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerProtokolTrialSkalaLab {
  static async createProtokolTrialSkalaLab(req, res, next) {
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
      } = req.body;

      const createdProtokolTrialSkalaLab = await ProtokolTrialSkalaLab.create({
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
      });

      res.status(201).json({
        message: "Success Create Protokol Trial Skala Lab",
        data: createdProtokolTrialSkalaLab,
      });
    } catch (err) {
      console.error(err);
      next(err);
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
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createCqa = await Cqa.create({
        qttpElements,
        target,
        safety,
        efficacy,
        formulaDanProses,
        apakahIniKritikalCqa,
        justifikasi,
        ProtokolTrialSkalaLabID,
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
  static async createCpp(req, res, next) {
    try {
      const {
        parameterProcess,
        CQA1,
        CQA2,
        apakahTermasukCpp,
        justifikasi,
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createCpp = await Cpp.create({
        parameterProcess,
        CQA1,
        CQA2,
        apakahTermasukCpp,
        justifikasi,
        ProtokolTrialSkalaLabID,
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
  static async createFormulaProtokol(req, res, next) {
    try {
      const {
        komposisi,
        fungsi,
        apakahAdaPadaKomposisiOriginatorKompetitor,
        justifikasi,
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createFormulaProtokol = await FormulaProtokol.create({
        komposisi,
        fungsi,
        apakahAdaPadaKomposisiOriginatorKompetitor,
        justifikasi,
        ProtokolTrialSkalaLabID,
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
  static async createProsesPembuatan(req, res, next) {
    try {
      const { prosesPembuatan, ProtokolTrialSkalaLabID } = req.body;

      const createProsesPembuatan = await ProsesPembuatan.create({
        prosesPembuatan,
        ProtokolTrialSkalaLabID,
      });

      res.status(201).json({
        message: "Success Create ProsesPembuatan",
        data: createProsesPembuatan,
      });
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
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createRencanaAktivitas = await RencanaAktivitas.create({
        tersediaBahanAwal,
        optimasiFormulaDanProses,
        stabilitaSkalaLab,
        ProtokolTrialSkalaLabID: +ProtokolTrialSkalaLabID,
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
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createOriginatorAtauKompetitor =
        await OriginatorAtauKompetitor.create({
          originator,
          source,
          harga,
          pemeriksaanFisikDanKimiaOriginator,
          profilDisolusi,
          stabilita,
          totalKebutuhanMaterial,
          perkiraanHargaPembelianMaterial,
          tableIndex: +tableIndex,
          ProtokolTrialSkalaLabID: +ProtokolTrialSkalaLabID,
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
  static async createKebutuhanPeralatanDanMesin(req, res, next) {
    try {
      const { peralatanDanMesin, fungsi, kapasitas, ProtokolTrialSkalaLabID } =
        req.body;

      const createKebutuhanPeralatanDanMesin =
        await KebutuhanPeralatanDanMesin.create({
          peralatanDanMesin,
          fungsi,
          kapasitas,
          ProtokolTrialSkalaLabID,
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
  static async createMaterial(req, res, next) {
    try {
      const {
        jumlahPenelitianAnalisaMaterial,
        biayaAnalisaMaterial,
        jumlahPenelitianOrientasiFormulaDanProses,
        biayaOrientasiFormulaDanProses,
        jumlahPenelitianOptimasiFormulaDanProses,
        biayaOptimasiFormulaDanProses,
        jumlahPenelitianStabilitaSkalaLab,
        biayaStabilitaSkalaLab,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        tableIndex,
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createMaterial = await Material.create({
        jumlahPenelitianAnalisaMaterial,
        biayaAnalisaMaterial,
        jumlahPenelitianOrientasiFormulaDanProses,
        biayaOrientasiFormulaDanProses,
        jumlahPenelitianOptimasiFormulaDanProses,
        biayaOptimasiFormulaDanProses,
        jumlahPenelitianStabilitaSkalaLab,
        biayaStabilitaSkalaLab,
        totalKebutuhanMaterial,
        perkiraanHargaPembelianMaterial,
        tableIndex: +tableIndex,
        ProtokolTrialSkalaLabID: +ProtokolTrialSkalaLabID,
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
  static async createZatAktif(req, res, next) {
    try {
      const {
        materialAttributes,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        ProtokolTrialSkalaLabID,
      } = req.body;
      const createZatAktif = await ZatAktif.create({
        materialAttributes,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        ProtokolTrialSkalaLabID,
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
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        ProtokolTrialSkalaLabID,
      } = req.body;
      const createBahanTambahan = await BahanTambahan.create({
        bahanTambahan,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        ProtokolTrialSkalaLabID,
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
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex,
        ProtokolTrialSkalaLabID,
      } = req.body;
      const createKemasanPrimer = await KemasanPrimer.create({
        materialAttributes,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
        tableIndex: +tableIndex,
        ProtokolTrialSkalaLabID,
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
  static async updateTujuan(req, res) {
    try {
      const { ProtokolTrialSkalaLabID } = req.params;
      const { tujuan } = req.body;
      const findProtokolTrialSkalaLabID = await ProtokolTrialSkalaLab.findByPk(
        +ProtokolTrialSkalaLabID
      );

      if (!findProtokolTrialSkalaLabID) throw { name: "NotFound" };
      const updateTujuan = await ProtokolTrialSkalaLab.update(
        { tujuan: tujuan },
        {
          where: {
            id: findProtokolTrialSkalaLabID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateTujuan);
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProtokolTrialSkalaLab;
