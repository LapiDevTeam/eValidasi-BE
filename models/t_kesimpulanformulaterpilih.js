"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kesimpulanFormulaTerpilih extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_kesimpulanFormulaTerpilih.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_kesimpulanFormulaTerpilih.init(
    {
      komposisi: DataTypes.STRING,
      jumlah: DataTypes.STRING,
      apakahAdaPadaKomposisiOriginator: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_kesimpulanFormulaTerpilih",
      freezeTableName: true,
    }
  );
  return t_kesimpulanFormulaTerpilih;
};
