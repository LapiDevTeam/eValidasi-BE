"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class StudiOriginator extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  StudiOriginator.init(
    {
      deskripsiProduct: DataTypes.JSONB,
      farmalogiKlinis: DataTypes.JSONB,
      formula: DataTypes.JSONB,
      kemasan: DataTypes.JSONB,
      stabilita: DataTypes.JSONB,
      karakteristik: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: "StudiOriginator",
      freezeTableName: true,
    }
  );
  return StudiOriginator;
};
