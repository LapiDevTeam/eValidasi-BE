"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix_rancanganSpesifikasiObatJadi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaFix_rancanganSpesifikasiObatJadi.belongsTo(models.t_formulaFix, {
        foreignKey: "FormulaFixID",
      });
    }
  }
  t_formulaFix_rancanganSpesifikasiObatJadi.init(
    {
      parameter: DataTypes.TEXT,
      spesifikasi: DataTypes.TEXT,
      referensi: DataTypes.TEXT,
      justifikasi: DataTypes.TEXT,
      FormulaFixID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix_rancanganSpesifikasiObatJadi",
      freezeTableName: true,
    }
  );
  return t_formulaFix_rancanganSpesifikasiObatJadi;
};
