"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_cpp_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association
    }
  }
  t_cpp_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      parameterProcess: DataTypes.STRING,
      pengaruhKeCqa: DataTypes.JSONB,
      apakahTermasukCpp: DataTypes.STRING,
      justifikasi: DataTypes.TEXT,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_cpp_hist",
      freezeTableName: true,
    }
  );
  return t_cpp_hist;
};
