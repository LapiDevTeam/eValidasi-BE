"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_studiPraformulasi_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_studiPraformulasi_hist.belongsTo(models.t_productBrief_hist, {
        foreignKey: "ProductBriefId",
      });
      t_studiPraformulasi_hist.hasMany(models.t_deskripsiProduct_hist, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi_hist.hasMany(models.t_farmalogiKlinis_hist, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi_hist.hasMany(models.t_formula_hist, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi_hist.hasMany(models.t_stabilita_hist, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi_hist.hasMany(models.t_studiPaten_hist, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_studiPraformulasi_hist.init(
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
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_studiPraformulasi_hist",
      freezeTableName: true,
    }
  );
  return t_studiPraformulasi_hist;
};
