"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class KarakteristikBahanTambahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      KarakteristikBahanTambahan.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  KarakteristikBahanTambahan.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
      hasilTinjauan: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "KarakteristikBahanTambahan",
      freezeTableName: true,
    }
  );
  return KarakteristikBahanTambahan;
};
