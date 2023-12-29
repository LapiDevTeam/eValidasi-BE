const {
  StudiPraformulasi,
  ProductBrief,
  DeskripsiProduct,
  FarmalogiKlinis,
  Stabilita,
  Formula,
} = require("../models/index");
const getPagination = require("../helpers/getPagination");
const MyError = require("../helpers/errors");

class ControllerStudiPraformulasi {
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

      const studi = await StudiPraformulasi.findAndCountAll({
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

      await StudiPraformulasi.destroy({
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
        studiOriginatorId,
        studiLiterature,
        studiPaten,
        ujiKompatibilitas,
        kesimpulan,
        ProductBriefId,
      } = req.body;

      const createdStudiPraformulasi = await StudiPraformulasi.create({
        nomor,
        tanggalPenyusunan,
        namaProduk,
        komposisi,
        kemasan,
        alasan,
        tujuan,
        productBriefNo,
        studiOriginatorId,
        studiLiterature,
        studiPaten,
        ujiKompatibilitas,
        kesimpulan,
        ProductBriefId,
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

      const createDeskripsiProduct = await DeskripsiProduct.create({
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

      const createFarmalogiKlinis = await FarmalogiKlinis.create({
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

      const createFormula = await Formula.create({
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

      const createStabilita = await Stabilita.create({
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
  static async getProductBrief(req, res) {
    try {
      const noProductBrief = await ProductBrief.findAll({
        attributes: [
          "id",
          "productBrief",
          "nama",
          "kode",
          "kemasan",
          "bahanAktifDanDosis",
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
      const findStudiPraformulasiID = await StudiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const updateTujuan = await StudiPraformulasi.update(
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
  static async updateDokumenAcuan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { productBriefNo } = req.body;
      const findStudiPraformulasiID = await StudiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const updateDokumenAcuan = await StudiPraformulasi.update(
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
}

module.exports = ControllerStudiPraformulasi;
