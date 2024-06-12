"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kebutuhanPeralatanDanMesin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_kebutuhanPeralatanDanMesin.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_kebutuhanPeralatanDanMesin.init(
    {
      peralatanDanMesin: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      kapasitas: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_kebutuhanPeralatanDanMesin",
      freezeTableName: true,
    }
  );
  return t_kebutuhanPeralatanDanMesin;
};
