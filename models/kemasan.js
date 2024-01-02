"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Kemasan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Kemasan.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  Kemasan.init(
    {
      namaProduk: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      noBatch: DataTypes.STRING,
      tanggalProduksi: DataTypes.STRING,
      tanggalKadarluarsa: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Kemasan",
      freezeTableName: true,
    }
  );
  return Kemasan;
};
