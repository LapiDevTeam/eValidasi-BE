"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_karakteristikFisikakimia_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_karakteristikFisikakimia_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      noBatch: DataTypes.STRING,
      tanggalProduksi: DataTypes.STRING,
      tanggalKadarluarsa: DataTypes.STRING,
      het: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      detailSediaan: DataTypes.JSONB,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_karakteristikFisikakimia_hist",
      freezeTableName: true,
    }
  );
  return t_karakteristikFisikakimia_hist;
};
