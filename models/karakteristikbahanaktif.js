"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KarakteristikBahanAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KarakteristikBahanAktif.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  KarakteristikBahanAktif.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
      hasilTinjauan: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KarakteristikBahanAktif",
      freezeTableName: true,
    }
  );
  return KarakteristikBahanAktif;
};
