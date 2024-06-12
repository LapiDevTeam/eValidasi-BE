"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_stabilita extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_stabilita.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_stabilita.init(
    {
      namaProduk: DataTypes.STRING,
      kondisiPenyimpanan: DataTypes.STRING,
      kondisiKhusus: DataTypes.STRING,
      hasilStudiStabilita: DataTypes.STRING,
      masaKadaluarsa: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_stabilita",
      freezeTableName: true,
    }
  );
  return t_stabilita;
};
