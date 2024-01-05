"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KarakteristikFisikakimia extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KarakteristikFisikakimia.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  KarakteristikFisikakimia.init(
    {
      namaProduk: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      noBatch: DataTypes.STRING,
      tanggalProduksi: DataTypes.STRING,
      tanggalKadarluarsa: DataTypes.STRING,
      het: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KarakteristikFisikakimia",
      freezeTableName: true,
    }
  );
  return KarakteristikFisikakimia;
};
