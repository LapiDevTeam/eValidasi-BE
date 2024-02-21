"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BahanTambahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BahanTambahan.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  BahanTambahan.init(
    {
      bahanTambahan: DataTypes.STRING,
      Cqa1: DataTypes.STRING,
      Cqa2: DataTypes.STRING,
      apakahVariabelDapatDimodifikasi: DataTypes.STRING,
      apakahTermasukCma: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "BahanTambahan",
      freezeTableName: true,
    }
  );
  return BahanTambahan;
};
