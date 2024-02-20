"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormulaProtokol extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      FormulaProtokol.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  FormulaProtokol.init(
    {
      komposisi: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      apakahAdaPadaKomposisiOriginatorKompetitor: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "FormulaProtokol",
      freezeTableName: true,
    }
  );
  return FormulaProtokol;
};
