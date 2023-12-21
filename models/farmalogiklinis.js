"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FarmalogiKlinis extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      FarmalogiKlinis.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  FarmalogiKlinis.init(
    {
      indikasi: DataTypes.STRING,
      mekanismeAksi: DataTypes.STRING,
      efekSamping: DataTypes.STRING,
      absorpsi: DataTypes.STRING,
      distribusi: DataTypes.STRING,
      metabolisme: DataTypes.STRING,
      eliminasi: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "FarmalogiKlinis",
      freezeTableName: true,
    }
  );
  return FarmalogiKlinis;
};
