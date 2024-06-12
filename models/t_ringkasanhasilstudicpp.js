"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_ringkasanHasilStudiCpp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_ringkasanHasilStudiCpp.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_ringkasanHasilStudiCpp.init(
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
      modelName: "t_ringkasanHasilStudiCpp",
      freezeTableName: true,
    }
  );
  return t_ringkasanHasilStudiCpp;
};
