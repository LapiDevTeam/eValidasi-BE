"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_prosesCatatanTrialPadat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_prosesCatatanTrialPadat.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_prosesCatatanTrialPadat.init(
    {
      kodeTrial: DataTypes.STRING,
      speed: DataTypes.STRING,
      mainPressure: DataTypes.STRING,
      prePressure: DataTypes.STRING,
      settingBobot: DataTypes.STRING,
      kekerasan: DataTypes.STRING,
      tebal: DataTypes.STRING,
      abrasi: DataTypes.STRING,
      wh: DataTypes.STRING,
      keterangan: DataTypes.STRING,
      jam: DataTypes.STRING,
      gelatinTank: DataTypes.STRING,
      gelatinBox: DataTypes.STRING,
      hopper: DataTypes.STRING,
      needle: DataTypes.STRING,
      pumpHeating: DataTypes.STRING,
      setDensity: DataTypes.STRING,
      jogSpeed: DataTypes.STRING,

      tableIndex: DataTypes.INTEGER,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_prosesCatatanTrialPadat",
      freezeTableName: true,
    }
  );
  return t_prosesCatatanTrialPadat;
};
