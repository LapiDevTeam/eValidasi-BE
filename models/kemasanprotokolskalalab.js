"use strict";
const { Model, INTEGER } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KemasanProtokolSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KemasanProtokolSkalaLab.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  KemasanProtokolSkalaLab.init(
    {
      parameterBentukSediaan: DataTypes.STRING,
      samaDenganOriginatorAtauKompetitorBentukSediaan: DataTypes.STRING,
      justifikasiBentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KemasanProtokolSkalaLab",
      freezeTableName: true,
    }
  );
  return KemasanProtokolSkalaLab;
};
