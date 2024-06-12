"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_updateRiskAssessmentBahanAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_updateRiskAssessmentBahanAktif.belongsTo(
        models.t_laporanTrialSkalaLab,
        {
          foreignKey: "LaporanTrialSkalaLabID",
        }
      );
    }
  }
  t_updateRiskAssessmentBahanAktif.init(
    {
      cqaHeader: DataTypes.JSONB,
      rows: DataTypes.JSONB,
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_updateRiskAssessmentBahanAktif",
      freezeTableName: true,
    }
  );
  return t_updateRiskAssessmentBahanAktif;
};
