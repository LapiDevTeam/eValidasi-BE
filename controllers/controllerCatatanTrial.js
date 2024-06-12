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
      // const user = req.user;
      const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
      // console.log(req.user, "<<");
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

      const createCatatanTrial = await t_catatanTrial.create({
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

      const createKomposisi = await t_komposisiCatatanTrial.create({
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

      const createPerhitunganZatAktif = await t_perhitunganZatAktif.create({
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

      const createMetodePembuatan = await t_metodePembuatan.create({
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
        await t_prosesCatatanTrialPenyalutan.create({
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
        await t_prosesCatatanTrialPadat.create({
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
        overmaat,
        satuan,
        bentukSediaan,
        detailFormula,
        CatatanTrialID,
      } = req.body;

      const createFormula = await t_formulaCatatanTrial.create({
        tujuanTrial: tujuanTrial,
        tiapSediaan: tiapSediaan,
        besarBets: besarBets,
        overmaat: overmaat,
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
      const { pengamatanAwalCair, CatatanTrialID } = req.body;

      const createPengamatanAwalCair = await t_pengamatanAwalCair.create({
        pengamatanAwalCair: pengamatanAwalCair,
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
      const { pengamatanAwalSteril, CatatanTrialID } = req.body;

      const createPengamatanAwalSteril = await t_pengamatanAwalSteril.create({
        pengamatanAwalSteril: pengamatanAwalSteril,
        CatatanTrialID,
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

      const createPengamatanLanjutan = await t_pengamatanLanjutan.create({
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
  static async updatePerhitunganBatasBahanTambahan(req, res) {
    try {
      const { CatatanTrialID } = req.params;
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
        console.log(id, "<< id");
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
        console.log(catatanTrialDetails, "<< detil");
      } else {
        console.log("test");
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
      console.log(catatanTrialDetails, "<<< DETAILS");
      // const apprApplicationCode = catatanTrialDetails.apprAplicationCode;
      const apprDeptId = catatanTrialDetails.bagian;
      console.log(apprDeptId, "<DEBTID");
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
      const metodePembuatanCair = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalCair = await t_pengamatanAwalCair.findOne({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanCair = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });
      console.log(perhitunganZatAktifCair, " << zat cair");
      // if (isApprove.message) throw new MyError(400, isApprove.message);
      console.log(pengamatanAwalCair, "<< PENGAMATAN AWAL CAIR");
      res.status(200).json({
        catatanTrialDetailCair,
        komposisiCair,
        perhitunganZatAktifCair,
        formulaCair,
        metodePembuatanCair,
        pengamatanAwalCair: pengamatanAwalCair?.dataValues?.pengamatanAwalCair,
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
      const metodePembuatanSteril = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalSteril = await t_pengamatanAwalSteril.findOne({
        where: { CatatanTrialID: id },
      });
      const pengamatanLanjutanSteril = await t_pengamatanLanjutan.findOne({
        where: { CatatanTrialID: id },
      });
      console.log(perhitunganZatAktifSteril, " << zat Steril");
      // if (isApprove.message) throw new MyError(400, isApprove.message);
      console.log(pengamatanAwalSteril, "<< PENGAMATAN AWAL Steril");
      res.status(200).json({
        catatanTrialDetailSteril,
        komposisiSteril,
        perhitunganZatAktifSteril,
        formulaSteril,
        metodePembuatanSteril,
        pengamatanAwalSteril:
          pengamatanAwalSteril?.dataValues?.pengamatanAwalSteril,
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

      console.log("xixixixiix");

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
      const metodePembuatanPadat = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const prosesCatatanTrialPadat = await t_prosesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPadat = await t_pengamatanAwalPadat.findOne({
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
      const metodePembuatanPenyalutan = await t_metodePembuatan.findAll({
        where: { CatatanTrialID: id },
      });
      const pengamatanAwalPenyalutan = await t_pengamatanAwalPenyalutan.findOne(
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
      const [updatedRowsCount] = await t_komposisiCatatanTrial.update(
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

      const [updatedRowsCount] = await t_formulaCatatanTrial.update(
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

      const [updatedRowsCount] = await t_metodePembuatan.update(
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

      const pengamatanAwalCairData = req.body.data; // Access req.body.data
      console.log(pengamatanAwalCairData, "<< REQ body");

      const updatedPengamatanCair = t_pengamatanAwalCair.update(
        {
          pengamatanAwalCair: pengamatanAwalCairData || null,
        },
        {
          where: { CatatanTrialID: +id },
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

  static async updatePengamatanAwalSteril(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");

      const pengamatanAwalSterilData = req.body.data; // Access req.body.data
      console.log(pengamatanAwalSterilData, "<< REQ body");

      const updatedPengamatanSteril = t_pengamatanAwalSteril.update(
        {
          pengamatanAwalSteril: pengamatanAwalSterilData || null,
        },
        {
          where: { CatatanTrialID: +id },
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
  static async updatePengamatanAwalLanjutan(req, res, next) {
    try {
      const { id } = req.params; // Ambil id catatan trial dari URL
      console.log(id, "<< IDIDIDIDID");
      const { kodeTrialHeaders, content } = req.body;

      const [updatedRowsCount] = await t_pengamatanLanjutan.update(
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

      const [updatedRowsCount] = await t_prosesCatatanTrialPadat.update(
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

      const proses = await t_prosesCatatanTrialPadat.findAll({
        where: { CatatanTrialID: +id },
      });

      if (proses.length > 0) {
        await t_prosesCatatanTrialPadat.destroy({
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

      const komposisi = await t_komposisiCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      if (komposisi.length > 0) {
        await t_komposisiCatatanTrial.destroy({
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

      const formula = await t_formulaCatatanTrial.findAll({
        where: { CatatanTrialID: +id },
      });

      if (formula.length > 0) {
        await t_formulaCatatanTrial.destroy({
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

      const metode = await t_metodePembuatan.findAll({
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

      const pengamatanAwalPadat = await t_pengamatanAwalPadat.findAll({
        where: { CatatanTrialID: +id },
      });

      if (pengamatanAwalPadat.length > 0) {
        await t_pengamatanAwalPadat.destroy({
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

      const pengamatanlanjutan = await t_pengamatanLanjutan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (pengamatanlanjutan.length > 0) {
        await t_pengamatanLanjutan.destroy({
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

      const proses = await t_prosesCatatanTrialPenyalutan.findAll({
        where: { CatatanTrialID: +id },
      });

      if (proses.length > 0) {
        await t_prosesCatatanTrialPenyalutan.destroy({
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

      const pengamatanAwalPenyalutan = await t_pengamatanAwalPenyalutan.findAll(
        {
          where: { CatatanTrialID: +id },
        }
      );

      if (pengamatanAwalPenyalutan.length > 0) {
        await t_pengamatanAwalPenyalutan.destroy({
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
      await t_catatanTrial.update(
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
