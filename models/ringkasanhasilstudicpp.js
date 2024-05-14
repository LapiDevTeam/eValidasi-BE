"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RingkasanHasilStudiCpp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RingkasanHasilStudiCpp.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  RingkasanHasilStudiCpp.init(
    {
      prosesParameter: DataTypes.STRING,
      CqaYangDiStudi: DataTypes.STRING,
      rangeStudi: DataTypes.STRING,
      controlStrategy: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RingkasanHasilStudiCpp",
      freezeTableName: true,
    }
  );
  return RingkasanHasilStudiCpp;
};
