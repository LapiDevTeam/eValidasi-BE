"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KontrolBahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KontrolBahan.belongsTo(models.UjiInkompatibilitas, {
        foreignKey: "UjiInkompatibilitasID",
      });
    }
  }
  KontrolBahan.init(
    {
      namaBahan: DataTypes.STRING,
      parameter1: DataTypes.STRING,
      parameter2: DataTypes.STRING,
      parameter3: DataTypes.STRING,
      UjiInkompatibilitasID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KontrolBahan",
      freezeTableName: true,
    }
  );
  return KontrolBahan;
};
