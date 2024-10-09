"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaCatatanTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaCatatanTrial.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_formulaCatatanTrial.init(
    {
      tujuanTrial: DataTypes.TEXT,
      tiapSediaan: DataTypes.STRING,
      besarBets: DataTypes.INTEGER,
      overmaat: DataTypes.INTEGER,
      satuan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      kodeTrials: DataTypes.JSONB,
      detailFormula: DataTypes.JSONB,
      notes: DataTypes.TEXT,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaCatatanTrial",
      freezeTableName: true,
    }
  );
  return t_formulaCatatanTrial;
};
