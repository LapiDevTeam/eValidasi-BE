"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_karakteristikBahanKemasan_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_karakteristikBahanKemasan_hist.belongsTo(
        models.t_studiPraformulasi_hist,
        {
          foreignKey: "StudiPraformulasiID",
        }
      );
    }
  }
  t_karakteristikBahanKemasan_hist.init(
    {
      namaBahan: DataTypes.STRING,
      parameter: DataTypes.STRING,
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
      modelName: "t_karakteristikBahanKemasan_hist",
      freezeTableName: true,
    }
  );
  return t_karakteristikBahanKemasan_hist;
};
