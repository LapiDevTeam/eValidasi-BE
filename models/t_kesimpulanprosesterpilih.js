"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kesimpulanProsesTerpilih extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_kesimpulanProsesTerpilih.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  t_kesimpulanProsesTerpilih.init(
    {
      tahapanProses: DataTypes.STRING,
      parameter: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_kesimpulanProsesTerpilih",
      freezeTableName: true,
    }
  );
  return t_kesimpulanProsesTerpilih;
};
