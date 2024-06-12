"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_originatorAtauKompetitor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_originatorAtauKompetitor.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_originatorAtauKompetitor.init(
    {
      originator: DataTypes.STRING,
      source: DataTypes.STRING,
      harga: DataTypes.STRING,
      pemeriksaanFisikDanKimiaOriginator: DataTypes.STRING,
      profilDisolusi: DataTypes.STRING,
      stabilita: DataTypes.STRING,
      totalKebutuhanMaterial: DataTypes.STRING,
      perkiraanHargaPembelianMaterial: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_originatorAtauKompetitor",
      freezeTableName: true,
    }
  );
  return t_originatorAtauKompetitor;
};
