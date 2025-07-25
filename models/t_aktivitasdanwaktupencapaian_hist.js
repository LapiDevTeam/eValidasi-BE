"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_aktivitasDanWaktuPencapaian_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
  
    }
  }
  t_aktivitasDanWaktuPencapaian_hist.init(
    {
      rencanaTersediaBahanAwal: DataTypes.STRING,
      pencapaianTersediaBahanAwal: DataTypes.STRING,
      rencanaOptimasiFormula: DataTypes.STRING,
      pencapaianOptimasiFormula: DataTypes.STRING,
      rencanaStabilitaSkalaLab: DataTypes.STRING,
      pencapaianStabilitaSkalaLab: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_aktivitasDanWaktuPencapaian_hist",
      freezeTableName: true,
    }
  );
  return t_aktivitasDanWaktuPencapaian_hist;
};
