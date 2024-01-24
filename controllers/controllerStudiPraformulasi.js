const {
  StudiPraformulasi,
  ProductBrief,
  DeskripsiProduct,
  FarmalogiKlinis,
  Stabilita,
  Formula,
  Kemasan,
  UjiInkompatibilitas,
  KontrolBahan,
  Sequelize,
  StudiPaten,
  KarakteristikBahanAktif,
  KarakteristikBahanKemasan,
  KarakteristikFisikakimia,
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

      const studi = await StudiPraformulasi.findByPk(+id);
      const studiNo = studi.addendumKe;
      console.log(studiNo, "<<<<<<<<<<<<<<<<<< STUDI");

      const [updatedRowsCount] = await StudiPraformulasi.update(
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

      const deskripsi = await DeskripsiProduct.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(deskripsi, "<<<des");

      if (deskripsi.length > 0) {
        await DeskripsiProduct.destroy({
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
  static async deleteFarmakologiKlinis(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const farm = await FarmalogiKlinis.findAll({
        where: { StudiPraformulasiID: +id },
      });

      console.log(farm, "<<<des");

      if (farm.length > 0) {
        await FarmalogiKlinis.destroy({
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
  static async createKemasan(req, res, next) {
    try {
      const {
        StudiPraformulasiID,
        namaProduk,
        manufacturer,
        noBatch,
        tanggalProduksi,
        tanggalKadarluarsa,
        sumberPustaka,
        bentukSediaan,
        detailSediaan,
      } = req.body;

      const createKemasan = await Kemasan.create({
        StudiPraformulasiID: StudiPraformulasiID,
        namaProduk: namaProduk,
        manufacturer: manufacturer,
        noBatch: noBatch,
        tanggalProduksi: tanggalProduksi,
        tanggalKadarluarsa: tanggalKadarluarsa,
        sumberPustaka: sumberPustaka,
        bentukSediaan: bentukSediaan,
        detailSediaan: detailSediaan,
      });

      res.status(201).json({
        message: "Success Create kemasan",
        data: createKemasan,
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

      const kemasan = await Kemasan.findAll({
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

      const [updatedRowsCount] = await Kemasan.update(
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

      const createFisikaKimia = await KarakteristikFisikakimia.create({
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
  static async deleteStabilita(req, res) {
    try {
      const { id } = req.params;

      console.log(id, 898989);

      const stabilita = await Stabilita.findAll({
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
  static async createKesimpulan(req, res) {
    try {
      const { StudiPraformulasiID } = req.params;
      const { kesimpulan } = req.body;
      const findStudiPraformulasiID = await StudiPraformulasi.findByPk(
        +StudiPraformulasiID
      );

      if (!findStudiPraformulasiID) throw { name: "NotFound" };
      const createKesimpulan = await StudiPraformulasi.update(
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
  static async getStudiPraformulasiDetails(req, res) {
    const { id } = req.params;
    try {
      const studiDetails = await StudiPraformulasi.findByPk(id);
      if (!studiDetails) throw new MyError(400, "notFound!");
      // console.log(studiDetails, "<<");
      res.status(200).json(studiDetails);
    } catch (err) {
      console.log(err);
    }
  }
  static async getDeskripsiProductDetails(req, res) {
    const { id } = req.params;
    try {
      const desDetails = await DeskripsiProduct.findAll({
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

      const [updatedRowsCount] = await DeskripsiProduct.update(
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
      const farmakologiDetail = await FarmalogiKlinis.findAll({
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

      const [updatedRowsCount] = await FarmalogiKlinis.update(
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
      const formulaDetail = await Formula.findAll({
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

      const [updatedRowsCount] = await Formula.update(
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
      const stabilitaDetails = await Stabilita.findAll({
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
      const uji = await UjiInkompatibilitas.findAll({
        where: { StudiPraformulasiID: +id },
      });

      if (!uji || uji.length === 0) {
        throw new MyError(404, "Not found!");
      }

      const kontrolBahan = await KontrolBahan.findAll({
        where: { UjiInkompatibilitasID: uji[0].id },
      });

      // Now you have both 'uji' and 'kontrolBahan' available for further processing

      res.status(200).json({ uji, kontrolBahan });
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

      const [updatedRowsCount] = await Stabilita.update(
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
      const kemasanDetails = await Kemasan.findAll({
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
      const fisikaKimiaDetails = await KarakteristikFisikakimia.findAll({
        where: { StudiPraformulasiID: id },
      });

      if (!fisikaKimiaDetails || fisikaKimiaDetails.length === 0) {
        throw new MyError(404, "Not found!");
      }

      // console.log(fisikaKimiaDetails, "<<");
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

      const [updatedRowsCount] = await KarakteristikFisikakimia.update(
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

      const createUjiInkomptabilitas = await UjiInkompatibilitas.create({
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

      const kontrolbahan = await KontrolBahan.create({
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
}

module.exports = ControllerStudiPraformulasi;
