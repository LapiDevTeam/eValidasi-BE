"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_perhitunganBahanBakuFormulaFix_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_perhitunganBahanBakuFormulaFix_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      title: DataTypes.TEXT,
      headers: DataTypes.JSONB,
      contents: DataTypes.JSONB,
      FormulaFixID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_perhitunganBahanBakuFormulaFix_hist",
      freezeTableName: true,
    }
  );
  return t_perhitunganBahanBakuFormulaFix_hist;
};
