"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class CatatanTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      CatatanTrial.hasMany(models.KomposisiCatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PerhitunganZatAktif, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.MetodePembuatan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.ProsesCatatanTrialPadat, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.ProsesCatatanTrialPenyalutan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.Pembahasan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.Kesimpulan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.TindakLanjut, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.FormulaCatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PengamatanAwalCair, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PengamatanAwalPenyalutan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PengamatanLanjutan, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PengamatanAwalPadat, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.PengamatanAwalSteril, {
        foreignKey: "CatatanTrialID",
      });
      CatatanTrial.hasMany(models.t_catatanTrial_status, {
        foreignKey: "CatatanTrialID",
        as: "approver_data",
      });
    }
  }
  CatatanTrial.init(
    {
      tanggalTrial: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      kodeTrial: DataTypes.STRING,
      trialKe: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      productKompetitor: DataTypes.STRING,
      status: DataTypes.STRING,
      pembahasan: DataTypes.TEXT,
      kesimpulan: DataTypes.TEXT,
      tindakLanjut: DataTypes.TEXT,
      filter: DataTypes.STRING,
      tipeCatatanTrial: DataTypes.STRING,
      pic: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "CatatanTrial",
      freezeTableName: true,
    }
  );
  return CatatanTrial;
};
