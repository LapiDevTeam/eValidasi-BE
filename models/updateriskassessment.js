"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UpdateRiskAssessment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UpdateRiskAssessment.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  UpdateRiskAssessment.init(
    {
      cqaHeader: DataTypes.JSONB,
      rows: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UpdateRiskAssessment",
      freezeTableName: true,
    }
  );
  return UpdateRiskAssessment;
};
