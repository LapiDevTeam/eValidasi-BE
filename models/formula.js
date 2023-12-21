"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Formula extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Formula.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  Formula.init(
    {
      bahanTambahan: DataTypes.STRING,
      kandungan: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      prosesPembuatan: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Formula",
      freezeTableName: true,
    }
  );
  return Formula;
};
