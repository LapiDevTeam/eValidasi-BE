"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_LTS_tanggalPengambilanSampel extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_LTS_tanggalPengambilanSampel.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_LTS_tanggalPengambilanSampel.init(
    {
      no: DataTypes.STRING,
      namaBahanBaku: DataTypes.TEXT,
      bn: DataTypes.TEXT,
      md: DataTypes.TEXT,
      tanggalMulaiStudi: DataTypes.TEXT,
      waktuSampling: DataTypes.TEXT,
      kondisi: DataTypes.TEXT,
      tableIndex:DataTypes.INT,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_LTS_tanggalPengambilanSampel",
      freezeTableName: true,
    }
  );
  return t_LTS_tanggalPengambilanSampel;
};
