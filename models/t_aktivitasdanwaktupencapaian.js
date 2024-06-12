"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_aktivitasDanWaktuPencapaian extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_aktivitasDanWaktuPencapaian.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_aktivitasDanWaktuPencapaian.init(
    {
      rencanaTersediaBahanAwal: DataTypes.STRING,
      pencapaianTersediaBahanAwal: DataTypes.STRING,
      rencanaOptimasiFormula: DataTypes.STRING,
      pencapaianOptimasiFormula: DataTypes.STRING,
      rencanaStabilitaSkalaLab: DataTypes.STRING,
      pencapaianStabilitaSkalaLab: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_aktivitasDanWaktuPencapaian",
      freezeTableName: true,
    }
  );
  return t_aktivitasDanWaktuPencapaian;
};
