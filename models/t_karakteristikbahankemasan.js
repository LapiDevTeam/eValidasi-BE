"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_karakteristikBahanKemasan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_karakteristikBahanKemasan.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_karakteristikBahanKemasan.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
      hasilTinjauan: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_karakteristikBahanKemasan",
      freezeTableName: true,
    }
  );
  return t_karakteristikBahanKemasan;
};
