"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UsulanPenelitianProduk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UsulanPenelitianProduk.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  UsulanPenelitianProduk.init(
    {
      faktor: DataTypes.STRING,
      parameter: DataTypes.STRING,
      usulanSkalaPilot: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UsulanPenelitianProduk",
      freezeTableName: true,
    }
  );
  return UsulanPenelitianProduk;
};
