"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_prosesCatatanTrialPadat_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_prosesCatatanTrialPadat_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      speed: DataTypes.STRING,
      mainPressure: DataTypes.STRING,
      prePressure: DataTypes.STRING,
      settingBobot: DataTypes.STRING,
      kekerasan: DataTypes.STRING,
      tebal: DataTypes.STRING,
      abrasi: DataTypes.STRING,
      wh: DataTypes.STRING,
      keterangan: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_prosesCatatanTrialPadat_hist",
      freezeTableName: true,
    }
  );
  return t_prosesCatatanTrialPadat_hist;
};
