"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FormulaCatatanTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      FormulaCatatanTrial.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  FormulaCatatanTrial.init(
    {
      tujuanTrial: DataTypes.STRING,
      tiapSediaan: DataTypes.STRING,
      besarBets: DataTypes.INTEGER,
      overmaat: DataTypes.INTEGER,
      satuan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      detailFormula: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "FormulaCatatanTrial",
      freezeTableName: true,
    }
  );
  return FormulaCatatanTrial;
};
