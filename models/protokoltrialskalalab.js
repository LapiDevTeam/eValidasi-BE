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
    }
  }
  ProtokolTrialSkalaLab.init(
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
      lainlain: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "ProtokolTrialSkalaLab",
      freezeTableName: true,
    }
  );
  return ProtokolTrialSkalaLab;
};
