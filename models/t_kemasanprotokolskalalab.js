"use strict";
const { Model, INTEGER } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kemasanProtokolSkalaLab extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_kemasanProtokolSkalaLab.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_kemasanProtokolSkalaLab.init(
    {
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
      modelName: "t_kemasanProtokolSkalaLab",
      freezeTableName: true,
    }
  );
  return t_kemasanProtokolSkalaLab;
};
