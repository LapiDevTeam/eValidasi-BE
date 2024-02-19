"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Cqa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Cqa.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  Cqa.init(
    {
      qttpElements: DataTypes.STRING,
      target: DataTypes.STRING,
      safety: DataTypes.STRING,
      efficacy: DataTypes.STRING,
      formulaDanProses: DataTypes.STRING,
      apakahIniKritikalCqa: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Cqa",
      freezeTableName: true,
    }
  );
  return Cqa;
};
