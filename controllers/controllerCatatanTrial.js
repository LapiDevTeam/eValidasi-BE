const {
  CatatanTrial,
  KomposisiCatatanTrial,
  PerhitunganZatAktif,
  MetodePembuatan,
  ProsesCatatanTrialPadat,
  ProsesCatatanTrialPenyalutan,
  FormulaCatatanTrial,
  PengamatanAwalCair,
  PengamatanLanjutan,
  PengamatanAwalPadat,
  PengamatanAwalSteril,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");

class ControllerCatatanTrial {
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
      } = req.body;

      // if (!tanggalTrial) {
      //   throw new MyError(400, "tanggalTrial is required !");
      // } else if (!kodeTrial) {
      //   throw new MyError(400, "kodeTrial is require !");
      // } else if (!trialKe) {
      //   throw new MyError(400, " is required !");
      // } else if (!bentukSediaan) {
      //   throw new MyError(400, "Bentuk Sediaan is required !");
      // } else if (!productKompetitor) {
      //   throw new MyError(400, "productKompetitor is required !");
      // }

      const createCatatanTrial = await CatatanTrial.create({
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
  static async createKomposisiCatatanTrial(req, res, next) {
    try {
      const {
        kode,
        namaBahanBaku,
        principle,
        jumlahTiapSediaan,
        CatatanTrialID,
      } = req.body;

      const createKomposisi = await KomposisiCatatanTrial.create({
        kode,
        namaBahanBaku,
        principle,
        jumlahTiapSediaan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create komposisiCatatanTrial",
        data: createKomposisi,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createPerhitunganZatAktif(req, res, next) {
    try {
      const {
        padaEtiket,
        bahanBakuYangDigunakan,
        perhitunganBahanBaku,
        CatatanTrialID,
      } = req.body;

      const createPerhitunganZatAktif = await PerhitunganZatAktif.create({
        padaEtiket,
        bahanBakuYangDigunakan,
        perhitunganBahanBaku,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create perhitungan zat aktif",
        data: createPerhitunganZatAktif,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createMetodePembuatan(req, res, next) {
    try {
      const { aktivitas, pengamatan, CatatanTrialID } = req.body;

      const createMetodePembuatan = await MetodePembuatan.create({
        aktivitas,
        pengamatan,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create metode pembuatan",
        data: createMetodePembuatan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createProsesCatatanTrialPenyalutan(req, res, next) {
    try {
      const { tanggal, jam, turretSpeed, suhu, bobot, CatatanTrialID } =
        req.body;

      const createProsesCatatanTrialPenyalutan =
        await ProsesCatatanTrialPenyalutan.create({
          tanggal,
          jam,
          turretSpeed,
          suhu,
          bobot,
          CatatanTrialID,
        });

      res.status(201).json({
        message: "Success Create proses Catatna trial Penyalutan",
        data: createProsesCatatanTrialPenyalutan,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createProsesCatatanTrialPadat(req, res, next) {
    try {
      const {
        speed,
        mainPressure,
        prePressure,
        settingBobot,
        kekerasan,
        tebal,
        abrasi,
        wh,
        keterangan,
        CatatanTrialID,
      } = req.body;

      const createProsesCatatanTrialPadat =
        await ProsesCatatanTrialPadat.create({
          speed,
          mainPressure,
          prePressure,
          settingBobot,
          kekerasan,
          tebal,
          abrasi,
          wh,
          keterangan,
          CatatanTrialID,
        });

      res.status(201).json({
        message: "Success Create proses Catatna trial padat",
        data: createProsesCatatanTrialPadat,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async createFormulaCatatanTrial(req, res, next) {
    try {
      const {
        tujuanTrial,
        tiapSediaan,
        besarBets,
        satuan,
        bentukSediaan,
        detailFormula,
        CatatanTrialID,
      } = req.body;

      const createFormula = await FormulaCatatanTrial.create({
        tujuanTrial: tujuanTrial,
        tiapSediaan: tiapSediaan,
        besarBets: besarBets,
        satuan: satuan,
        bentukSediaan: bentukSediaan,
        detailFormula: detailFormula,
        CatatanTrialID: +CatatanTrialID,
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
  static async createPengamatanAwalCair(req, res, next) {
    try {
      const {
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratViskositas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianViskositas,
        CatatanTrialID,
      } = req.body;

      const createPengamatanAwalCair = await PengamatanAwalCair.create({
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratViskositas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianViskositas,
        CatatanTrialID,
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
  static async createPengamatanAwalSteril(req, res, next) {
    try {
      const {
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratOsmolaritas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianOsmolaritas,
        CatatanTrialID,
      } = req.body;

      const createPengamatanAwalSteril = await PengamatanAwalSteril.create({
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratOsmolaritas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianOsmolaritas,
        CatatanTrialID,
      });

      res.status(201).json({
        message: "Success Create pengamatan awal steril",
        data: createPengamatanAwalSteril,
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
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

      const createPengamatanAwalPadat = await PengamatanAwalPadat.create({
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
  static async createPengamatanLanjutan(req, res, next) {
    try {
      const { kodeTrialHeaders, content, CatatanTrialID } = req.body;

      const createPengamatanLanjutan = await PengamatanLanjutan.create({
        kodeTrialHeaders,
        content,
        CatatanTrialID,
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
  static async updatePembahasan(req, res) {
    try {
      const { CatatanTrialID } = req.params;
      const { pembahasan } = req.body;
      const findCatatanTrialID = await CatatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updatePembahasan = await CatatanTrial.update(
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
      const { kesimpulan } = req.body;
      const findCatatanTrialID = await CatatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateKesimpulan = await CatatanTrial.update(
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
      const { tindakLanjut } = req.body;
      const findCatatanTrialID = await CatatanTrial.findByPk(+CatatanTrialID);

      if (!findCatatanTrialID) throw { name: "NotFound" };
      const updateTindakLanjut = await CatatanTrial.update(
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
  static async getKomposisiNamaBahan(req, res) {
    const { id } = req.params;
    try {
      const komposisi = await KomposisiCatatanTrial.findAll({
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
  static async getFilterCatatanTrialPadat(req, res) {
    try {
      const catatanTrialPadat = await CatatanTrial.findAll({
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
  static async findAllCatatanTrial(req, res) {
    try {
      const {
        page,
        tanggalTrial,
        namaProduk,
        kodeTrial,
        trialKe,
        bentukSediaan,
        productKompetitor,
        statusB,
        statusA,
      } = req.body;
      const size = page ? 15 : "";

      const { limit, offset } = getPagination(page, size);

      const searchParams = {};
      if (tanggalTrial)
        searchParams.tanggalTrial = { [Op.iLike]: `%${tanggalTrial}%` };
      if (namaProduk)
        searchParams.namaProduk = { [Op.iLike]: `%${namaProduk}%` };
      if (kodeTrial) searchParams.kodeTrial = { [Op.iLike]: `%${kodeTrial}%` };
      if (trialKe) searchParams.trialKe = { [Op.iLike]: `%${trialKe}%` };
      if (bentukSediaan) searchParams.bentukSediaan = +bentukSediaan;
      if (productKompetitor)
        searchParams.productKompetitor = {
          [Op.iLike]: `%${productKompetitor}%`,
        };
      if (statusB)
        searchParams.statusB = {
          [Op.iLike]: `%${statusB}%`,
        };
      if (statusA)
        searchParams.statusA = {
          [Op.iLike]: `%${statusA}%`,
        };

      const brief = await CatatanTrial.findAndCountAll({
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
      const { id } = req.params;

      const catatanTrialDetailCair = await CatatanTrial.findOne({
        where: {
          id,
        },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailCair,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialCairDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailCair = await CatatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiCair = await KomposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifCair = await PerhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaCair = await FormulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanCair = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalCair = await PengamatanAwalCair.findOne({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanCair = await PengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
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
  static async getCatatanTrialPadatDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPadat = await CatatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiPadat = await KomposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifPadat = await PerhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaPadat = await FormulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanPadat = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const prosesCatatanTrialPadat = await ProsesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPadat = await PengamatanAwalPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanPadat = await PengamatanLanjutan.findAll({
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
  static async getCatatanTrialSterilDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailSteril = await CatatanTrial.findOne({
        where: {
          id,
        },
      });
      const komposisiSteril = await KomposisiCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const perhitunganZatAktifSteril = await PerhitunganZatAktif.findAll({
        where: { CatatanTrialID: id },
      });
      const formulaSteril = await FormulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanSteril = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalSteril = await PengamatanAwalSteril.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanSteril = await PengamatanLanjutan.findAll({
        where: { CatatanTrialID: id },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailSteril,
        komposisiSteril,
        perhitunganZatAktifSteril,
        formulaSteril,
        metodePembuatanSteril,
        prosesCatatanTrialSteril,
        pengamatanAwalSteril,
        pengamatanLanjutanSteril,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  static async getCatatanTrialPenyalutanDetails(req, res, next) {
    try {
      const { id } = req.params;

      const catatanTrialDetailPenyalutan = await CatatanTrial.findOne({
        where: {
          id,
        },
      });

      const formulaPenyalutan = await FormulaCatatanTrial.findAll({
        where: { CatatanTrialID: id },
      });
      const prosesPenyalutan = await ProsesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanPenyalutan = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPenyalutan = await PengamatanAwalPadat.findAll({
        where: { CatatanTrialID: id },
      });

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
  static async deleteCatatanTrial(req, res) {
    try {
      const { id } = req.params;

      await CatatanTrial.destroy({
        where: { id: +id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
}

module.exports = ControllerCatatanTrial;
