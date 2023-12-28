"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class DeskripsiProduct extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      DeskripsiProduct.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  DeskripsiProduct.init(
    {
      namaStudi: DataTypes.STRING,
      namaProduk: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      dosage: DataTypes.STRING,
      labelClaim: DataTypes.STRING,
      rutePemberian: DataTypes.STRING,
      aturanPakai: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      note: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "DeskripsiProduct",
      freezeTableName: true,
    }
  );
  return DeskripsiProduct;
};
