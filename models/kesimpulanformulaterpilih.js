"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KesimpulanFormulaTerpilih extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KesimpulanFormulaTerpilih.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  KesimpulanFormulaTerpilih.init(
    {
      komposisi: DataTypes.STRING,
      jumlah: DataTypes.STRING,
      apakahAdaPadaKomposisiOriginator: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KesimpulanFormulaTerpilih",
      freezeTableName: true,
    }
  );
  return KesimpulanFormulaTerpilih;
};
