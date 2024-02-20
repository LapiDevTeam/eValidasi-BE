"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class OriginatorAtauKompetitor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      OriginatorAtauKompetitor.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  OriginatorAtauKompetitor.init(
    {
      originator: DataTypes.STRING,
      source: DataTypes.STRING,
      harga: DataTypes.STRING,
      pemeriksaanFisikDanKimiaOriginator: DataTypes.STRING,
      profilDisolusi: DataTypes.STRING,
      stabilita: DataTypes.STRING,
      totalKebutuhanMaterial: DataTypes.STRING,
      perkiraanHargaPembelianMaterial: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "OriginatorAtauKompetitor",
      freezeTableName: true,
    }
  );
  return OriginatorAtauKompetitor;
};
