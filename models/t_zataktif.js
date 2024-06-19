"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_zatAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_zatAktif.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_zatAktif.init(
    {
      materialAttributes: DataTypes.STRING,
      pengaruhKeCqa: DataTypes.JSONB,
      apakahVariabelDapatDimodifikasi: DataTypes.STRING,
      apakahTermasukCma: DataTypes.STRING,
      justifikasi: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_zatAktif",
      freezeTableName: true,
    }
  );
  return t_zatAktif;
};
