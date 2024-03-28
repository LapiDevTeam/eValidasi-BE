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
  PengamatanAwalPenyalutan,
  t_catatanTrial_status,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { checkStatusCatatanTrial } = require("../helpers/checkStatus");
const { getStatusCatatanTrial } = require("../helpers/statusCatatanTrial");
const {
  isApproveValidation,
  approverRecordset,
} = require("../helpers/approver");

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
      const { nama_user, bagian_user } = req.user;
      console.log(req.user, "<<");
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
        pic,
      } = req.body;

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
        pic: nama_user || "",
        bagian: bagian_user || "",
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

      const createPengamatanAwalPenyalutan =
        await PengamatanAwalPenyalutan.create({
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
        });

      res.status(201).json({
        message: "Success Create pengamatan awal Penyalutan",
        data: createPengamatanAwalPenyalutan,
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
    console.log("xixixi");
    try {
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      console.log(req.user, "< req user");
      const { id } = req.params;
      // console.log(id, "<< req uer");
      let catatanTrialDetails;
      if (+joblevel_id_user === 1 || bagian_user === bagian_user) {
        console.log(id, "<< id");
        catatanTrialDetails = await CatatanTrial?.findOne({
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
        console.log(catatanTrialDetails, "<< detil");
      } else {
        console.log("test");
        catatanTrialDetails = await CatatanTrial.findOne({
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
      console.log(catatanTrialDetails, "<<< DETAILS");
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = catatanTrialDetails.bagian;
      const apprNo = await checkStatusCatatanTrial(id);

      const isApprove = await isApproveValidation(
        // productBriefDetail.nama_pegawai,
        "catatanTrial",
        apprDeptId,
        apprNo,
        user_id
        // nama_user
      );
      console.log(isApprove, "<< asdasda");
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
      console.log(perhitunganZatAktifCair, " << zat cair");
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

      console.log("xixixixiix");

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
      const formulaPadat = await FormulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanPadat = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const prosesCatatanTrialPadat = await ProsesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPadat = await PengamatanAwalPadat.findOne({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanPadat = await PengamatanLanjutan.findOne({
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
      const formulaSteril = await FormulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanSteril = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalSteril = await PengamatanAwalSteril.findOne({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanSteril = await PengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });

      // if (isApprove.message) throw new MyError(400, isApprove.message);
      res.status(200).json({
        catatanTrialDetailSteril,
        komposisiSteril,
        perhitunganZatAktifSteril,
        formulaSteril,
        metodePembuatanSteril,
        // prosesCatatanTrialSteril,
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

      const formulaPenyalutan = await FormulaCatatanTrial.findOne({
        where: { CatatanTrialID: id },
      });
      const prosesPenyalutan = await ProsesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: id },
      });
      const metodePembuatanPenyalutan = await MetodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPenyalutan = await PengamatanAwalPenyalutan.findOne({
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
  static async updateCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
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

      const [updatedRowsCount] = await CatatanTrial.update(
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
  static async updateKomposisiCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { kode, namaBahanBaku, principle, jumlahTiapSediaan } = req.body;
      console.log(namaBahanBaku, "< << NAMA");
      const [updatedRowsCount] = await KomposisiCatatanTrial.update(
        {
          kode: kode || "",
          namaBahanBaku: namaBahanBaku || "",
          principle: principle || "",
          jumlahTiapSediaan: jumlahTiapSediaan || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "komposisi Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "komposisi Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updatePerhitunganZatAktif(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { padaEtiket, bahanBakuYangDigunakan, perhitunganBahanBaku } =
        req.body;

      const [updatedRowsCount] = await PerhitunganZatAktif.update(
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
  static async updateFormulaCatatanTrial(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const {
        tujuanTrial,
        tiapSediaan,
        besarBets,
        satuan,
        bentukSediaan,
        detailFormula,
      } = req.body;

      const [updatedRowsCount] = await FormulaCatatanTrial.update(
        {
          tujuanTrial: tujuanTrial || "",
          tiapSediaan: tiapSediaan || "",
          besarBets: besarBets || "",
          satuan: satuan || "",
          bentukSediaan: bentukSediaan || "",
          detailFormula: detailFormula || "",
        },
        {
          where: { CatatanTrialID: +id },
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
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updateMetodePembuatan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { aktivitas, pengamatan } = req.body;

      const [updatedRowsCount] = await MetodePembuatan.update(
        {
          aktivitas: aktivitas || "",
          pengamatan: pengamatan || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "metode Pembuatan Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "metode Pembuatan Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updatePengamatanAwalCair(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const {
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratViskositas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianViskositas,
      } = req.body;

      const [updatedRowsCount] = await PengamatanAwalCair.update(
        {
          syaratPemerian: syaratPemerian || "",
          syaratPh: syaratPh || "",
          syaratBj: syaratBj || "",
          syaratViskositas: syaratViskositas || "",
          hasilPengujianPemerian: hasilPengujianPemerian || "",
          hasilPengujianPh: hasilPengujianPh || "",
          hasilPengujianBj: hasilPengujianBj || "",
          hasilPengujianViskositas: hasilPengujianViskositas || "",
        },
        {
          where: { CatatanTrialID: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal cair Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal cair Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async updatePengamatanAwalSteril(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const {
        syaratPemerian,
        syaratPh,
        syaratBj,
        syaratOsmolaritas,
        hasilPengujianPemerian,
        hasilPengujianPh,
        hasilPengujianBj,
        hasilPengujianOsmolaritas,
      } = req.body;

      const [updatedRowsCount] = await PengamatanAwalSteril.update(
        {
          syaratPemerian: syaratPemerian || "",
          syaratPh: syaratPh || "",
          syaratBj: syaratBj || "",
          syaratOsmolaritas: syaratOsmolaritas || "",
          hasilPengujianPemerian: hasilPengujianPemerian || "",
          hasilPengujianPh: hasilPengujianPh || "",
          hasilPengujianBj: hasilPengujianBj || "",
          hasilPengujianOsmolaritas: hasilPengujianOsmolaritas || "",
        },
        {
          where: { CatatanTrialID: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "pengamatan awal steril Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "pengamatan awal steril Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }

  static async updatePengamatanAwalLanjutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { kodeTrialHeaders, content } = req.body;

      const [updatedRowsCount] = await PengamatanLanjutan.update(
        {
          kodeTrialHeaders: kodeTrialHeaders || "",
          content: content || "",
        },
        {
          where: { CatatanTrialID: +id },
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
  static async updateProsesCatatanTrialPadat(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
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
      } = req.body;

      const [updatedRowsCount] = await ProsesCatatanTrialPadat.update(
        {
          speed: speed || "",
          mainPressure: mainPressure || "",
          speed: speed || "",
          prePressure: prePressure || "",
          settingBobot: settingBobot || "",
          kekerasan: kekerasan || "",
          tebal: tebal || "",
          abrasi: abrasi || "",
          wh: wh || "",
          keterangan: keterangan || "",
        },
        {
          where: { id: +id },
        }
      );
      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "proses padat Catatan Trial updated successfully",
        });
      } else {
        res.status(404).json({
          message: "proses padat Catatan Trial not found",
        });
      }
    } catch (err) {
      console.log(err, "<< er");
      next(err);
    }
  }
  static async deleteProsesCatatanTrialPadat(req, res) {
    try {
      const { id } = req.params;

      const proses = await ProsesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: +id },
      });

      if (proses.length > 0) {
        await ProsesCatatanTrialPadat.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deleteKomposisiCatatanTrial(req, res) {
    try {
      const { id } = req.params;

      const komposisi = await KomposisiCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      if (komposisi.length > 0) {
        await KomposisiCatatanTrial.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deleteFormulaCatatanTrial(req, res) {
    try {
      const { id } = req.params;

      const formula = await FormulaCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      if (formula.length > 0) {
        await FormulaCatatanTrial.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deleteMetodePembuatan(req, res) {
    try {
      const { id } = req.params;

      const metode = await MetodePembuatan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (metode.length > 0) {
        await MetodePembuatan.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deletePengamatanAwalPadat(req, res) {
    try {
      const { id } = req.params;

      const pengamatanAwalPadat = await PengamatanAwalPadat.findAll({
        where: { CatatanTrialID: +id },
      });

      if (pengamatanAwalPadat.length > 0) {
        await PengamatanAwalPadat.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deletePengamatanLanjutan(req, res) {
    try {
      const { id } = req.params;

      const pengamatanlanjutan = await PengamatanLanjutan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (pengamatanlanjutan.length > 0) {
        await PengamatanLanjutan.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deleteProsesPenyalutan(req, res) {
    try {
      const { id } = req.params;

      const proses = await ProsesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (proses.length > 0) {
        await ProsesCatatanTrialPenyalutan.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
  static async deletePengamatanAwalPenyalutan(req, res) {
    try {
      const { id } = req.params;

      const pengamatanAwalPenyalutan = await PengamatanAwalPenyalutan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (pengamatanAwalPenyalutan.length > 0) {
        await PengamatanAwalPenyalutan.destroy({
          where: { CatatanTrialID: +id }, // Corrected the where clause
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
      const findCatatanTrial = await CatatanTrial.findByPk(+id);
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
      let status;
      if (
        dataApprove.recordset.length > 0 &&
        dataApprove.recordset.Appr_DefinitionID !== 0
      )
        status = getStatusCatatanTrial(
          dataApprove.recordset[0]?.Appr_DefinitionID
        );
      if (dataApprove.recordset1.length === 0) status = "Closed";
      if (is_approve === false) {
        status = "Reject";
        await t_catatanTrial_status.destroy({
          where: { CatatanTrialID: +id },
        });
      }

      console.log(status, "<< STAUTS");
      console.log(dataApprove.recordset[0]?.Appr_DefinitionID, "<< record set");

      console.log(is_approve, "<<< iNI IS APPROVE");

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
      await CatatanTrial.update(
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
}

module.exports = ControllerCatatanTrial;
