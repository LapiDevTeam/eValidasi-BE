"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ZatAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ZatAktif.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  ZatAktif.init(
    {
      materialAttributes: DataTypes.STRING,
      Cqa1: DataTypes.STRING,
      Cqa2: DataTypes.STRING,
      apakahVariabelDapatDimodifikasi: DataTypes.STRING,
      apakahTermasukCma: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ZatAktif",
      freezeTableName: true,
    }
  );
  return ZatAktif;
};
