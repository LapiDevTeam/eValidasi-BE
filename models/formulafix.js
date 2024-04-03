"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormulaFix extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FormulaFix.init(
    {
      namaProduk: DataTypes.STRING,
      filter: DataTypes.STRING,
      komposisi: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      nomorBets: DataTypes.STRING,
      revisi: DataTypes.STRING,
      alasan: DataTypes.STRING,
      formulaA: DataTypes.JSONB,
      formulaB: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: "FormulaFix",
      freezeTableName: true,
    }
  );
  return FormulaFix;
};
