"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_persentaseDalamFormula_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_persentaseDalamFormula_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      persenDalamFormula: DataTypes.INTEGER,
      skorA: DataTypes.INTEGER,
      bobotB: DataTypes.INTEGER,
      jumlah: DataTypes.FLOAT,
      ProposalDiversifikasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_persentaseDalamFormula_hist",
      freezeTableName: true,
    }
  );
  return t_persentaseDalamFormula_hist;
};
