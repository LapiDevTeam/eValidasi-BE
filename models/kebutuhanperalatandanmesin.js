"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KebutuhanPeralatanDanMesin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KebutuhanPeralatanDanMesin.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  KebutuhanPeralatanDanMesin.init(
    {
      peralatanDanMesin: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      kapasitas: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KebutuhanPeralatanDanMesin",
      freezeTableName: true,
    }
  );
  return KebutuhanPeralatanDanMesin;
};
