"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_mappingProcess extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_mappingProcess.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_mappingProcess.init(
    {
      processParameters: DataTypes.TEXT,
      materialAttributes: DataTypes.TEXT,
      manufacturingProcess: DataTypes.STRING,
      qualityAttributes: DataTypes.TEXT,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_mappingProcess",
      freezeTableName: true,
    }
  );
  return t_mappingProcess;
};
