"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UpdateRiskAssessmentBahanTambahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UpdateRiskAssessmentBahanTambahan.belongsTo(models.LaporanTrialSkalaLab, {
        foreignKey: "LaporanTrialSkalaLabID",
      });
    }
  }
  UpdateRiskAssessmentBahanTambahan.init(
    {
      cqaHeader: DataTypes.JSONB,
      rows: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UpdateRiskAssessmentBahanTambahan",
      freezeTableName: true,
    }
  );
  return UpdateRiskAssessmentBahanTambahan;
};
