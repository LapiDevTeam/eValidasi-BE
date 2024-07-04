"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_bahanTambahan_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_bahanTambahan_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      bahanTambahan: DataTypes.STRING,
      pengaruhKeCqa: DataTypes.JSONB,
      apakahVariabelDapatDimodifikasi: DataTypes.STRING,
      apakahTermasukCma: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_bahanTambahan_hist",
      freezeTableName: true,
    }
  );
  return t_bahanTambahan_hist;
};
