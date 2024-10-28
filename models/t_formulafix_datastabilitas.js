"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix_dataStabilitas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaFix_dataStabilitas.belongsTo(models.t_formulaFix, {
        foreignKey: "FormulaFixID",
      });
    }
  }
  t_formulaFix_dataStabilitas.init(
    {
      upload: DataTypes.JSONB,
      FormulaFixID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_upload: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix_dataStabilitas",
      freezeTableName: true,
    }
  );
  return t_formulaFix_dataStabilitas;
};
