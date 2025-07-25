"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_usulanPenelitianProduk_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    
    }
  }
  t_usulanPenelitianProduk_hist.init(
    {
      faktor: DataTypes.STRING,
      parameter: DataTypes.STRING,
      rangeStudiSkalaLab: DataTypes.STRING,
      usulanSkalaPilot: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_usulanPenelitianProduk_hist",
      freezeTableName: true,
    }
  );
  return t_usulanPenelitianProduk_hist;
};
