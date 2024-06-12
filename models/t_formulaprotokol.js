"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaProtokol extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaProtokol.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_formulaProtokol.init(
    {
      komposisi: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      apakahAdaPadaKomposisiOriginatorKompetitor: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_formulaProtokol",
      freezeTableName: true,
    }
  );
  return t_formulaProtokol;
};
