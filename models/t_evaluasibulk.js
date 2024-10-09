"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_evaluasiBulk extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_evaluasiBulk.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_evaluasiBulk.init(
    {
      bulkDensity: DataTypes.TEXT,
      tappedDensity: DataTypes.TEXT,
      carrIndex: DataTypes.TEXT,
      interpretasiHasil: DataTypes.TEXT,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_evaluasiBulk",
      freezeTableName: true,
    }
  );
  return t_evaluasiBulk;
};
