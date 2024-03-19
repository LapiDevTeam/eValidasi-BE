"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ProsesCatatanTrialPadat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProsesCatatanTrialPadat.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  ProsesCatatanTrialPadat.init(
    {
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
    },
    {
      sequelize,
      modelName: "ProsesCatatanTrialPadat",
      freezeTableName: true,
    }
  );
  return ProsesCatatanTrialPadat;
};
