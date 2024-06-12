"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_cqa extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_cqa.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_cqa.init(
    {
      qttpElements: DataTypes.STRING,
      target: DataTypes.STRING,
      safety: DataTypes.STRING,
      efficacy: DataTypes.STRING,
      formulaDanProses: DataTypes.STRING,
      apakahIniKritikalCqa: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_cqa",
      freezeTableName: true,
    }
  );
  return t_cqa;
};
