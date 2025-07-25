"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_LTS_bahanAktifCma_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
   
    }
  }
  t_LTS_bahanAktifCma_hist.init(
    {
      namaBahan: DataTypes.TEXT,
      judul: DataTypes.TEXT,
      content: DataTypes.TEXT,
      upload: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_LTS_bahanAktifCma_hist",
      freezeTableName: true,
    }
  );
  return t_LTS_bahanAktifCma_hist;
};
