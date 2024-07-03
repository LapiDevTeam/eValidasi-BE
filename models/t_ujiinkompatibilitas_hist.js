"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_ujiInkompatibilitas_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_ujiInkompatibilitas_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      namaBahan: DataTypes.STRING,
      kondisi1: DataTypes.STRING,
      kondisi2: DataTypes.STRING,
      kondisi3: DataTypes.STRING,
      detailUji: DataTypes.JSONB,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_ujiInkompatibilitas_hist",
      freezeTableName: true,
    }
  );
  return t_ujiInkompatibilitas_hist;
};
