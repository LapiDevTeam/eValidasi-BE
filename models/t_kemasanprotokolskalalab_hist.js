"use strict";
const { Model, INTEGER } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kemasanProtokolSkalaLab_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_kemasanProtokolSkalaLab_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      parameterBentukSediaan: DataTypes.STRING,
      samaDenganOriginatorAtauKompetitorBentukSediaan: DataTypes.STRING,
      justifikasiBentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_kemasanProtokolSkalaLab_hist",
      freezeTableName: true,
    }
  );
  return t_kemasanProtokolSkalaLab_hist;
};
