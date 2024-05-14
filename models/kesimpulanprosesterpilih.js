"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KesimpulanProsesTerpilih extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KesimpulanProsesTerpilih.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  KesimpulanProsesTerpilih.init(
    {
      tahapanProses: DataTypes.STRING,
      parameter: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KesimpulanProsesTerpilih",
      freezeTableName: true,
    }
  );
  return KesimpulanProsesTerpilih;
};
