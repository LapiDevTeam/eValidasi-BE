"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_protokolValidasi_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_protokolValidasi_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      jenisDokumen: DataTypes.STRING,
      filter: DataTypes.STRING,
      namaProduk: DataTypes.STRING,
      noDokumen: DataTypes.STRING,
      revisi: DataTypes.STRING,
      alasan: DataTypes.TEXT,
      upload: DataTypes.JSONB,
      bagian: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_protokolValidasi_hist",
      freezeTableName: true,
    }
  );
  return t_protokolValidasi_hist;
};
