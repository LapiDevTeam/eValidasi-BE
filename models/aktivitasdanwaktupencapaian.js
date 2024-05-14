"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class AktivitasDanWaktuPencapaian extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      AktivitasDanWaktuPencapaian.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  AktivitasDanWaktuPencapaian.init(
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
      modelName: "AktivitasDanWaktuPencapaian",
      freezeTableName: true,
    }
  );
  return AktivitasDanWaktuPencapaian;
};
