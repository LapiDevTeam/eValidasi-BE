"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ProtokolTrialSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProtokolTrialSkalaLab.hasMany(models.Cqa, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.FormulaProtokol, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.ProsesPembuatan, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.Cpp, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.RencanaAktivitas, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.OriginatorAtauKompetitor, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.KebutuhanPeralatanDanMesin, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.Material, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.ZatAktif, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.BahanTambahan, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.KemasanPrimer, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
      ProtokolTrialSkalaLab.hasMany(models.KemasanProtokolSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  ProtokolTrialSkalaLab.init(
    {
      nomor: DataTypes.STRING,
      tanggal: DataTypes.DATE,
      tanggalPengesahan: DataTypes.DATE,
      revisi: DataTypes.INTEGER,
      namaProduk: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      alasan: DataTypes.STRING,
      tujuan: DataTypes.STRING,
      productBriefNo: DataTypes.STRING,
      hasilStudiPraformulasiNo: DataTypes.STRING,
      status: DataTypes.STRING,
      lainlain: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: "ProtokolTrialSkalaLab",
      freezeTableName: true,
    }
  );
  return ProtokolTrialSkalaLab;
};
