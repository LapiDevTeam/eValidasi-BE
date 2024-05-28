"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class LaporanTrialSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      LaporanTrialSkalaLab.hasMany(models.AktivitasDanWaktuPencapaian, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.KesimpulanFormulaTerpilih, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.RingkasanHasilStudiCpp, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.RingkasanHasilStudiCma, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.KesimpulanProsesTerpilih, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.UsulanPenelitianProduk, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.UpdateRiskAssessment, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.UpdateRiskAssessmentBahanAktif, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.UpdateRiskAssessmentBahanTambahan, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.UpdateRiskAssessmentKemasan, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      LaporanTrialSkalaLab.hasMany(models.t_laporanTrialSkalaLab_status, {
        foreignKey: "LaporanTrialSkalaLabID",
        as: "approver_data",
      });
    }
  }
  LaporanTrialSkalaLab.init(
    {
      nomor: DataTypes.STRING,
      tanggal: DataTypes.DATE,
      revisi: DataTypes.INTEGER,
      namaProduk: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      alasan: DataTypes.STRING,
      tujuan: DataTypes.STRING,
      productBriefNo: DataTypes.STRING,
      hasilStudiPraformulasiNo: DataTypes.STRING,
      protokolPenelitianNo: DataTypes.STRING,
      status: DataTypes.STRING,
      rdSelection: DataTypes.STRING,
      lainlain: DataTypes.JSONB,
      alasan_reject: DataTypes.STRING,
      pic: DataTypes.STRING,
      bagian: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "LaporanTrialSkalaLab",
      freezeTableName: true,
    }
  );
  return LaporanTrialSkalaLab;
};
