"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formula extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formula.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_formula.init(
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
      modelName: "t_formula",
      freezeTableName: true,
    }
  );
  return t_formula;
};
