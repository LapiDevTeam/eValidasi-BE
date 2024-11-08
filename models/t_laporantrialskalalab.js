"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_laporanTrialSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_laporanTrialSkalaLab.hasMany(models.t_aktivitasDanWaktuPencapaian, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_kesimpulanFormulaTerpilih, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_ringkasanHasilStudiCpp, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_ringkasanHasilStudiCma, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_kesimpulanProsesTerpilih, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_usulanPenelitianProduk, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_updateRiskAssessment, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_updateRiskAssessmentBahanAktif, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(
        models.t_updateRiskAssessmentBahanTambahan,
        {
          foreignKey: "LaporanTrialSkalaLabID",
        }
      );
      t_laporanTrialSkalaLab.hasMany(models.t_updateRiskAssessmentKemasan, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasOne(models.t_LTS_studiScreeningSourceApi, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_LTS_kriteriaPenerimaan, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
      t_laporanTrialSkalaLab.hasMany(models.t_laporanTrialSkalaLab_status, {
        foreignKey: "LaporanTrialSkalaLabID",
        as: "approver_data",
      });
    }
  }
  t_laporanTrialSkalaLab.init(
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
      permasalahan: DataTypes.TEXT,
      tujuan: DataTypes.TEXT,
      skalaStudi: DataTypes.TEXT,
      penyimpanganSampel: DataTypes.TEXT,
      tahapanStudi: DataTypes.TEXT,
      pembahasan: DataTypes.TEXT,
      kesimpulan: DataTypes.TEXT,
      tindakLanjut: DataTypes.TEXT,
      alasan_reject: DataTypes.STRING,
      pic: DataTypes.STRING,
      bagian: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_laporanTrialSkalaLab",
      freezeTableName: true,
    }
  );
  return t_laporanTrialSkalaLab;
};
