"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_updateRiskAssessmentBahanTambahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_updateRiskAssessmentBahanTambahan.belongsTo(
        models.t_laporanTrialSkalaLab,
        {
          foreignKey: "LaporanTrialSkalaLabID",
        }
      );
    }
  }
  t_updateRiskAssessmentBahanTambahan.init(
    {
      cqaHeader: DataTypes.JSONB,
      rows: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_updateRiskAssessmentBahanTambahan",
      freezeTableName: true,
    }
  );
  return t_updateRiskAssessmentBahanTambahan;
};
