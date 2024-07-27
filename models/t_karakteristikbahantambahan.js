"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_karakteristikBahanTambahan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_karakteristikBahanTambahan.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_karakteristikBahanTambahan.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
      upload: DataTypes.JSONB,
      hasilTinjauan: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_karakteristikBahanTambahan",
      freezeTableName: true,
    }
  );
  return t_karakteristikBahanTambahan;
};
