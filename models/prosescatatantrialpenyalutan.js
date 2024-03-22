"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ProsesCatatanTrialPenyalutan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProsesCatatanTrialPenyalutan.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  ProsesCatatanTrialPenyalutan.init(
    {
      tanggal: DataTypes.STRING,
      jam: DataTypes.STRING,
      turretSpeed: DataTypes.STRING,
      suhu: DataTypes.STRING,
      bobot: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "ProsesCatatanTrialPenyalutan",
      freezeTableName: true,
    }
  );
  return ProsesCatatanTrialPenyalutan;
};
