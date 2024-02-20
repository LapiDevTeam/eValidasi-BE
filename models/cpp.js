"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Cpp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association
      Cpp.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  Cpp.init(
    {
      parameterProcess: DataTypes.STRING,
      CQA1: DataTypes.STRING,
      CQA2: DataTypes.STRING,
      apakahTermasukCpp: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Cpp",
      freezeTableName: true,
    }
  );
  return Cpp;
};
