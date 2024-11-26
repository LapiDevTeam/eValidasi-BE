"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix_dataStabilitas_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_formulaFix_dataStabilitas_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      upload: DataTypes.JSONB,
      FormulaFixID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_upload: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix_dataStabilitas_hist",
      freezeTableName: true,
    }
  );
  return t_formulaFix_dataStabilitas_hist;
};
