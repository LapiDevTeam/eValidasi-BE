"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_deskripsiProduct_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_deskripsiProduct_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      namaStudi: DataTypes.STRING,
      namaProduk: DataTypes.STRING,
      manufacturer: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      dosage: DataTypes.STRING,
      labelClaim: DataTypes.STRING,
      rutePemberian: DataTypes.STRING,
      aturanPakai: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      note: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_deskripsiProduct_hist",
      freezeTableName: true,
    }
  );
  return t_deskripsiProduct_hist;
};
