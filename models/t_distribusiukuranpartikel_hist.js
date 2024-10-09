"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_distribusiUkuranPartikel_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_distribusiUkuranPartikel_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      headers: DataTypes.JSONB,
      content: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_distribusiUkuranPartikel_hist",
      freezeTableName: true,
    }
  );
  return t_distribusiUkuranPartikel_hist;
};
