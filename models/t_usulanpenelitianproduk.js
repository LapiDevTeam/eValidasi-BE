"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_usulanPenelitianProduk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_usulanPenelitianProduk.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_usulanPenelitianProduk.init(
    {
      faktor: DataTypes.STRING,
      parameter: DataTypes.STRING,
      usulanSkalaPilot: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_usulanPenelitianProduk",
      freezeTableName: true,
    }
  );
  return t_usulanPenelitianProduk;
};
