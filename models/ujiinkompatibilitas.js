"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class UjiInkompatibilitas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UjiInkompatibilitas.hasMany(models.KontrolBahan, {
        foreignKey: "UjiInkompatibilitasID",
      });
    }
  }
  UjiInkompatibilitas.init(
    {
      namaBahan: DataTypes.STRING,
      kondisi1: DataTypes.STRING,
      kondisi2: DataTypes.STRING,
      kondisi3: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UjiInkompatibilitas",
      freezeTableName: true,
    }
  );
  return UjiInkompatibilitas;
};
