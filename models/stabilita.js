"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Stabilita extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Stabilita.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  Stabilita.init(
    {
      namaProduk: DataTypes.STRING,
      kondisiPenyimpanan: DataTypes.STRING,
      kondisiKhusus: DataTypes.STRING,
      hasilStudiStabilita: DataTypes.STRING,
      masaKadaluarsa: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Stabilita",
      freezeTableName: true,
    }
  );
  return Stabilita;
};
