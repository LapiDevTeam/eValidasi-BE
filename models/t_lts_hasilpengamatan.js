"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_LTS_hasilPengamatan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_LTS_hasilPengamatan.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_LTS_hasilPengamatan.init(
    {
      waktuPengamatan: DataTypes.TEXT,
      tanggal: DataTypes.TEXT,
      title: DataTypes.JSONB,
      content: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_LTS_hasilPengamatan",
      freezeTableName: true,
    }
  );
  return t_LTS_hasilPengamatan;
};
