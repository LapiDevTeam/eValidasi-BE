"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_karakteristikBahanAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_karakteristikBahanAktif.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_karakteristikBahanAktif.init(
    {
      namaBahan: DataTypes.TEXT,
      parameter: DataTypes.TEXT,
      upload: DataTypes.JSONB,
      hasilTinjauan: DataTypes.TEXT,
      sumberPustaka: DataTypes.TEXT,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_karakteristikBahanAktif",
      freezeTableName: true,
    }
  );
  return t_karakteristikBahanAktif;
};
