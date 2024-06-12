"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_studiPraformulasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_studiPraformulasi.belongsTo(models.t_productBrief, {
        foreignKey: "ProductBriefId",
      });
      t_studiPraformulasi.hasMany(models.t_deskripsiProduct, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_farmalogiKlinis, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_formula, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_stabilita, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_studiPaten, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_studiPraformulasi.init(
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
      kesimpulan: DataTypes.STRING,
      status: DataTypes.STRING,
      rdSelection: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_studiPraformulasi",
      freezeTableName: true,
    }
  );
  return t_studiPraformulasi;
};
