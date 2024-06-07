"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Qtpp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Qtpp.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  Qtpp.init(
    {
      bentukSediaan: DataTypes.STRING,
      targetBentukSediaan: DataTypes.STRING,
      justifikasiBentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Qtpp",
      freezeTableName: true,
    }
  );
  return Qtpp;
};
