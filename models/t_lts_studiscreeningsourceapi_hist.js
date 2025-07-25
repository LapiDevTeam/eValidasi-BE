"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_LTS_studiScreeningSourceApi_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
   
    }
  }
  t_LTS_studiScreeningSourceApi_hist.init(
    {
      permasalahan: DataTypes.TEXT,
      tujuan: DataTypes.TEXT,
      skalaStudi: DataTypes.TEXT,
      penyimpananSampel: DataTypes.TEXT,
      tahapanStudi: DataTypes.TEXT,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_LTS_studiScreeningSourceApi_hist",
      freezeTableName: true,
    }
  );
  return t_LTS_studiScreeningSourceApi_hist;
};
