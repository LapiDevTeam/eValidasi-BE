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
      modelName: "t_karakteristikBahanKemasan",
      freezeTableName: true,
    }
  );
  return t_karakteristikBahanKemasan;
};
