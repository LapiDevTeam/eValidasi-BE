"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MappingProcess extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MappingProcess.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  MappingProcess.init(
    {
      processParameters: DataTypes.TEXT,
      materialAttributes: DataTypes.TEXT,
      manufacturingProcess: DataTypes.STRING,
      qualityAttributes: DataTypes.TEXT,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "MappingProcess",
      freezeTableName: true,
    }
  );
  return MappingProcess;
};
