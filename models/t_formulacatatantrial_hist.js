"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaCatatanTrial_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_formulaCatatanTrial_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      tujuanTrial: DataTypes.STRING,
      tiapSediaan: DataTypes.STRING,
      besarBets: DataTypes.INTEGER,
      overmaat: DataTypes.INTEGER,
      satuan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      kodeTrials: DataTypes.JSONB,
      detailFormula: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaCatatanTrial_hist",
      freezeTableName: true,
    }
  );
  return t_formulaCatatanTrial_hist;
};
