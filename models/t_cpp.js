"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_cpp extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association
      t_cpp.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_cpp.init(
    {
      parameterProcess: DataTypes.STRING,
      pengaruhKeCqa: DataTypes.JSONB,
      apakahTermasukCpp: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_cpp",
      freezeTableName: true,
    }
  );
  return t_cpp;
};
