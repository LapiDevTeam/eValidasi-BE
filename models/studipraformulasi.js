"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class StudiPraformulasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      StudiPraformulasi.belongsTo(models.ProductBrief, {
        foreignKey: "ProductBriefId",
      });
      StudiPraformulasi.hasMany(models.DeskripsiProduct, {
        foreignKey: "StudiPraformulasiID",
      });
      StudiPraformulasi.hasMany(models.FarmalogiKlinis, {
        foreignKey: "StudiPraformulasiID",
      });
      StudiPraformulasi.hasMany(models.Formula, {
        foreignKey: "StudiPraformulasiID",
      });
      StudiPraformulasi.hasMany(models.Stabilita, {
        foreignKey: "StudiPraformulasiID",
      });
      StudiPraformulasi.hasMany(models.StudiPaten, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  StudiPraformulasi.init(
    {
      nomor: DataTypes.STRING,
      tanggalPenyusunan: DataTypes.DATE,
      tanggalAddendum: DataTypes.DATE,
      addendumKe: DataTypes.INTEGER,
      namaProduk: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      alasan: DataTypes.STRING,
      tujuan: DataTypes.STRING,
      productBriefNo: DataTypes.STRING,
      ProductBriefId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "StudiPraformulasi",
      freezeTableName: true,
    }
  );
  return StudiPraformulasi;
};
