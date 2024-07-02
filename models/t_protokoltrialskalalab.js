"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_protokolTrialSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // t_protokolTrialSkalaLab.hasMany(models.t_cqa, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_formulaProtokol, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_prosesPembuatan, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_cpp, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_rencanaAktivitas, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_originatorAtauKompetitor, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_material, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_kebutuhanPeralatanDanMesin, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });

      // t_protokolTrialSkalaLab.hasMany(models.t_zatAktif, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_bahanTambahan, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_kemasanPrimer, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      // t_protokolTrialSkalaLab.hasMany(models.t_kemasanProtokolSkalaLab, {
      //   foreignKey: "ProtokolTrialSkalaLabID",
      // });
      t_protokolTrialSkalaLab.hasMany(models.t_protokolSkalaLab_status, {
        foreignKey: "ProtokolTrialSkalaLabID",
        as: "approver_data",
      });
    }
  }
  t_protokolTrialSkalaLab.init(
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
      status: DataTypes.STRING,
      rdSelection: DataTypes.STRING,
      lainlain: DataTypes.JSONB,
      alasan_reject: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_protokolTrialSkalaLab",
      freezeTableName: true,
    }
  );
  return t_protokolTrialSkalaLab;
};
