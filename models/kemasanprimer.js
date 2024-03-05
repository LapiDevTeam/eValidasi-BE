"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KemasanPrimer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KemasanPrimer.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  KemasanPrimer.init(
    {
      materialAttributes: DataTypes.STRING,
      pengaruhKeCqa: DataTypes.JSONB,
      apakahVariabelDapatDimodifikasi: DataTypes.STRING,
      apakahTermasukCma: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KemasanPrimer",
      freezeTableName: true,
    }
  );
  return KemasanPrimer;
};
