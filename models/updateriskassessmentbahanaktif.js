"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UpdateRiskAssessmentBahanAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UpdateRiskAssessmentBahanAktif.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  UpdateRiskAssessmentBahanAktif.init(
    {
      cqaHeader: DataTypes.JSONB,
      rows: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UpdateRiskAssessmentBahanAktif",
      freezeTableName: true,
    }
  );
  return UpdateRiskAssessmentBahanAktif;
};
