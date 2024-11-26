"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaFix_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }
  t_formulaFix_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      filter: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      formulaAcuan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      besarBets: DataTypes.STRING,
      revisi: DataTypes.STRING,
      alasan: DataTypes.TEXT,
      formulaA: DataTypes.JSONB,
      formulaB: DataTypes.JSONB,
      formulaC: DataTypes.JSONB,
      formulaD: DataTypes.JSONB,
      keterangan: DataTypes.TEXT,
      pic: DataTypes.STRING,
      bagian: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaFix_hist",
      freezeTableName: true,
    }
  );
  return t_formulaFix_hist;
};
