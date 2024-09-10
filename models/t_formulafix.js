"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaFix.hasMany(models.t_formulaFix_status, {
        foreignKey: "FormulaFixID",
        as: "approver_data",
      });
      t_formulaFix.hasMany(models.t_perhitunganBahanBakuFormulaFix, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_kemasanFormulaFix, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_formulaFix_prosesPengolahan, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_formulaFix_prosesPengemasan, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_formulaFix_rancanganSpesifikasiObatJadi, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_formulaFix_dataStabilitas, {
        foreignKey: "FormulaFixID",
      });
      t_formulaFix.hasMany(models.t_formulaFix_acuanCatatanTrial, {
        foreignKey: "FormulaFixID",
      });
    }
  }
  t_formulaFix.init(
    {
      namaProduk: DataTypes.STRING,
      filter: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      formulaAcuan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      besarBets: DataTypes.STRING,
      revisi: DataTypes.STRING,
      alasan: DataTypes.STRING,
      formulaA: DataTypes.JSONB,
      formulaB: DataTypes.JSONB,
      formulaC: DataTypes.JSONB,
      pic: DataTypes.STRING,
      bagian: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      status: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix",
      freezeTableName: true,
    }
  );
  return t_formulaFix;
};
