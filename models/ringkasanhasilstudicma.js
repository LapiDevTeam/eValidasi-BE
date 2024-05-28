"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RingkasanHasilStudiCma extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RingkasanHasilStudiCma.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  RingkasanHasilStudiCma.init(
    {
      title: DataTypes.STRING,
      content: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RingkasanHasilStudiCma",
      freezeTableName: true,
    }
  );
  return RingkasanHasilStudiCma;
};
