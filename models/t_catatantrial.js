"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_catatanTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_catatanTrial.hasMany(models.t_komposisiCatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_perhitunganZatAktif, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_metodePembuatan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_prosesCatatanTrialPadat, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_prosesCatatanTrialPenyalutan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pembahasan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_kesimpulan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_tindakLanjut, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_formulaCatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pengamatanAwalCair, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pengamatanAwalPenyalutan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pengamatanLanjutan, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pengamatanAwalPadat, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_pengamatanAwalSteril, {
        foreignKey: "CatatanTrialID",
      });
      t_catatanTrial.hasMany(models.t_catatanTrial_status, {
        foreignKey: "CatatanTrialID",
        as: "approver_data",
      });
    }
  }
  t_catatanTrial.init(
    {
      tanggalTrial: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      // kodeTrial: DataTypes.STRING,
      trialKe: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      productKompetitor: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      perhitunganBatasBahanTambahan: DataTypes.TEXT,
      pembahasan: DataTypes.TEXT,
      kesimpulan: DataTypes.TEXT,
      tindakLanjut: DataTypes.TEXT,
      filter: DataTypes.STRING,
      tipeCatatanTrial: DataTypes.STRING,
      pic: DataTypes.STRING,
      bagian: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      upload: DataTypes.JSONB,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_catatanTrial",
      freezeTableName: true,
    }
  );
  return t_catatanTrial;
};
