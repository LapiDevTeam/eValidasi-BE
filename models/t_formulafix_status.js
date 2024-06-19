"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix_status extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaFix_status.belongsTo(models.t_formulaFix, {
        foreignKey: "FormulaFixID",
      });
    }
  }
  t_formulaFix_status.init(
    {
      FormulaFixID: DataTypes.INTEGER,
      approver_no: DataTypes.INTEGER,
      is_approve: DataTypes.BOOLEAN,
      approver_name: DataTypes.STRING,
      approver_joblevel_id: DataTypes.STRING,
      approver_inisial: DataTypes.STRING,
      keterangan_reject: DataTypes.TEXT,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix_status",
      freezeTableName: true,
    }
  );
  return t_formulaFix_status;
};
