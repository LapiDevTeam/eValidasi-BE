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
  MappingProcess,
  KemasanProtokolSkalaLab,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerProtokolTrialSkalaLab {
  static async findAllProtokolSkalaLab(req, res) {
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

      const studi = await ProtokolTrialSkalaLab.findAndCountAll({
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
  static async deleteProtokolSkalaLab(req, res) {
    try {
      const { id } = req.params;

      await ProtokolTrialSkalaLab.destroy({
        where: { id: id }, // Corrected the where clause
      });

      res.status(200).send({ msg: "succeed" });
    } catch (err) {
      console.log(err);
      res.status(500).send({ msg: "error" });
    }
  }
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
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createMaterial = await Material.create({
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
        ProtokolTrialSkalaLabID,
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
  static async createMappingProcess(req, res, next) {
    try {
      const {
        processParameters,
        materialAttributes,
        manufacturingProcess,
        qualityAttributes,
        ProtokolTrialSkalaLabID,
      } = req.body;

      console.log(req.body, "1231321");
      const createMappingProcess = await MappingProcess.create({
        processParameters,
        materialAttributes,
        manufacturingProcess,
        qualityAttributes,
        ProtokolTrialSkalaLabID,
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
  static async createKemasanSkalaLab(req, res, next) {
    try {
      const {
        parameterBentukSediaan,
        samaDenganOriginatorAtauKompetitorBentukSediaan,
        justifikasiBentukSediaan,
        detailSediaan,
        ProtokolTrialSkalaLabID,
      } = req.body;

      const createKemasan = await KemasanProtokolSkalaLab.create({
        parameterBentukSediaan: parameterBentukSediaan,
        samaDenganOriginatorAtauKompetitorBentukSediaan:
          samaDenganOriginatorAtauKompetitorBentukSediaan,
        justifikasiBentukSediaan: justifikasiBentukSediaan,
        detailSediaan: detailSediaan,
        ProtokolTrialSkalaLabID: ProtokolTrialSkalaLabID,
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
  static async getProtokolSkalaLabDetails(req, res) {
    const { id } = req.params;
    try {
      const protokolDetails = await ProtokolTrialSkalaLab.findByPk(+id);
      if (!protokolDetails) throw new MyError(400, "notFound!");
      // console.log(protokolDetails, "<<");
      res.status(200).json(protokolDetails);
    } catch (err) {
      console.log(err);
    }
  }
  static async editProtokolSkalaLab(req, res, next) {
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
        obj.ProductBriefId = ProductBriefIs;
      }

      const proto = await ProtokolTrialSkalaLab.findByPk(+id);
      // const protoNo = studi.addendumKe;
      // console.log(studiNo, "<<<<<<<<<<<<<<<<<< STUDI");

      const [updatedRowsCount] = await ProtokolTrialSkalaLab.update(
        {
          ...obj,
        },
        {
          where: { id: id },
        }
      );

      console.log(updatedRowsCount, "<<< updated");

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "protokol skala lab updated successfully",
        });
      } else {
        res.status(404).json({
          message: "protokol skala lab not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async getCqa(req, res) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const cqaDetails = await Cqa.findAll({
        where: { ProtokolTrialSkalaLabID: +id },
      });

      console.log(cqaDetails, "<< cqa details");

      if (!cqaDetails || cqaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(cqaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getCpp(req, res) {
    const { id } = req.params;
    try {
      const cppDetails = await Cpp.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!cppDetails || cppDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(cppDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getFormula(req, res) {
    const { id } = req.params;
    try {
      const formulaDetails = await FormulaProtokol.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!formulaDetails || formulaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(formulaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getProsesPembuatan(req, res) {
    const { id } = req.params;
    try {
      const pembuatanDetails = await ProsesPembuatan.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!pembuatanDetails || pembuatanDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(pembuatanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getRencanaAktivitas(req, res) {
    const { id } = req.params;
    try {
      const rencanaDetails = await RencanaAktivitas.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!rencanaDetails || rencanaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(rencanaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getMaterial(req, res) {
    const { id } = req.params;
    try {
      const materialDetails = await Material.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!materialDetails || materialDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(materialDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getOriginatorKompetitor(req, res) {
    const { id } = req.params;
    try {
      const originatorDetails = await OriginatorAtauKompetitor.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!originatorDetails || originatorDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(originatorDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getKebutuhanPeralatan(req, res) {
    const { id } = req.params;
    try {
      const kebutuhanDetails = await KebutuhanPeralatanDanMesin.findAll({
        where: { ProtokolTrialSkalaLabID: id },
      });

      if (!kebutuhanDetails || kebutuhanDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(kebutuhanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getZatAktif(req, res) {
    const { id } = req.params;
    try {
      const zatAktifDetails = await ZatAktif.findAll({
        where: { ProtokolTrialSkalaLabID: +id },
      });

      if (!zatAktifDetails || zatAktifDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(zatAktifDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getBahanTambahan(req, res) {
    const { id } = req.params;
    try {
      const bahanTambahanDetails = await BahanTambahan.findAll({
        where: { ProtokolTrialSkalaLabID: +id },
      });

      if (!bahanTambahanDetails || bahanTambahanDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(bahanTambahanDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getKemasanPrimer(req, res) {
    const { id } = req.params;
    try {
      const kemasanPrimerDetails = await KemasanPrimer.findAll({
        where: { ProtokolTrialSkalaLabID: +id },
      });

      if (!kemasanPrimerDetails || kemasanPrimerDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(kemasanPrimerDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getCqaFilterYes(req, res) {
    const { id } = req.params;
    try {
      const cqaDetails = await Cqa.findAll({
        where: { ProtokolTrialSkalaLabID: +id, apakahIniKritikalCqa: "Yes" },
      });

      if (!cqaDetails || cqaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      res.status(200).json(cqaDetails);
    } catch (err) {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
  static async getMappingProcess(req, res) {
    const { id } = req.params;
    try {
      const mappingDetails = await MappingProcess.findAll({
        where: { ProtokolTrialSkalaLabID: +id },
        order: [["createdAt", "ASC"]], // Order by createdAt descending
      });

      if (!mappingDetails || mappingDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

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

      const [updatedRowsCount] = await MappingProcess.update(
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
  static async editCqaDetails(req, res, next) {
    const { id } = req.params;
    try {
      const {
        qttpElements,
        target,
        safety,
        efficacy,
        formulaDanProses,
        apakahIniKritikalCqa,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await Cqa.update(
        {
          qttpElements,
          target,
          safety,
          efficacy,
          formulaDanProses,
          apakahIniKritikalCqa,
          justifikasi,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "cqa updated successfully",
        });
      } else {
        res.status(404).json({
          message: "cqa not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editCppDetails(req, res, next) {
    const { id } = req.params;
    try {
      const { parameterProcess, CQA1, CQA2, apakahTermasukCpp, justifikasi } =
        req.body;

      const [updatedRowsCount] = await Cpp.update(
        {
          parameterProcess,
          CQA1,
          CQA2,
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
  static async editZatAktif(req, res, next) {
    const { id } = req.params;
    try {
      const {
        materialAttributes,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await ZatAktif.update(
        {
          materialAttributes,
          Cqa1,
          Cqa2,
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
    try {
      const {
        materialAttributes,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await KemasanPrimer.update(
        {
          materialAttributes,
          Cqa1,
          Cqa2,
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
          message: "kemasanPrimer updated successfully",
        });
      } else {
        res.status(404).json({
          message: "kemasanPrimer not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editBahanTambahan(req, res, next) {
    const { id } = req.params;
    try {
      const {
        bahanTambahan,
        Cqa1,
        Cqa2,
        apakahVariabelDapatDimodifikasi,
        apakahTermasukCma,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await BahanTambahan.update(
        {
          bahanTambahan,
          Cqa1,
          Cqa2,
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
          message: "bahanTambahan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "bahanTambahan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async editMaterial(req, res, next) {
    const { id } = req.params;
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
      } = req.body;

      const [updatedRowsCount] = await Material.update(
        {
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

      const [updatedRowsCount] = await OriginatorAtauKompetitor.update(
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
  static async editKebutuhanPeralatan(req, res, next) {
    const { id } = req.params;
    try {
      const { peralatanDanMesin, fungsi, kapasitas } = req.body;

      const [updatedRowsCount] = await KebutuhanPeralatanDanMesin.update(
        {
          peralatanDanMesin,
          fungsi,
          kapasitas,
        },
        {
          where: { id: id },
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
  static async editFormulaDetails(req, res, next) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const {
        komposisi,
        fungsi,
        apakahAdaPadaKomposisiOriginatorKompetitor,
        justifikasi,
      } = req.body;

      const [updatedRowsCount] = await FormulaProtokol.update(
        {
          komposisi,
          fungsi,
          apakahAdaPadaKomposisiOriginatorKompetitor,
          justifikasi,
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
  static async editRencanaAktivitas(req, res, next) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const { tersediaBahanAwal, optimasiFormulaDanProses, stabilitaSkalaLab } =
        req.body;

      const [updatedRowsCount] = await RencanaAktivitas.update(
        {
          tersediaBahanAwal,
          optimasiFormulaDanProses,
          stabilitaSkalaLab,
        },
        {
          where: { id: id },
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
  static async editProsesPembuatan(req, res, next) {
    const { id } = req.params;
    console.log(id, "< id");
    try {
      const { prosesPembuatan } = req.body;

      const [updatedRowsCount] = await ProsesPembuatan.update(
        {
          prosesPembuatan,
        },
        {
          where: { id: id },
        }
      );

      if (updatedRowsCount > 0) {
        res.status(201).json({
          message: "prosesPembuatan updated successfully",
        });
      } else {
        res.status(404).json({
          message: "prosesPembuatan not found",
        });
      }
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
  static async updateDokumenAcuanProtokol(req, res) {
    try {
      const { ProtokolTrialSkalaLabID } = req.params;
      console.log(ProtokolTrialSkalaLabID, "<!@312312312");
      const { productBriefNo, hasilStudiPraformulasiNo, lainlain } = req.body;
      const findProtokolTrialSkalaLabID = await ProtokolTrialSkalaLab.findByPk(
        +ProtokolTrialSkalaLabID
      );

      console.log(findProtokolTrialSkalaLabID, "< IDDDDDDD ");

      if (!findProtokolTrialSkalaLabID) throw { name: "NotFound" };
      const updateDokumenAcuan = await ProtokolTrialSkalaLab.update(
        {
          productBriefNo: productBriefNo,
          hasilStudiPraformulasiNo: hasilStudiPraformulasiNo,
          lainlain: lainlain,
        },
        {
          where: {
            id: findProtokolTrialSkalaLabID.id,
          },
          returning: true,
        }
      );
      res.status(200).json(updateDokumenAcuan);
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ControllerProtokolTrialSkalaLab;
