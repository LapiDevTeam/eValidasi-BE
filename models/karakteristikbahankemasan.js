"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KarakteristikBahanKemasan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KarakteristikBahanKemasan.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  KarakteristikBahanKemasan.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
      hasilTinjauan: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KarakteristikBahanKemasan",
      freezeTableName: true,
    }
  );
  return KarakteristikBahanKemasan;
};
