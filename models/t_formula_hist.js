"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formula_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formula_hist.belongsTo(models.t_studiPraformulasi_hist, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_formula_hist.init(
    {
      bahanTambahan: DataTypes.STRING,
      kandungan: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      prosesPembuatan: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formula_hist",
      freezeTableName: true,
    }
  );
  return t_formula_hist;
};
