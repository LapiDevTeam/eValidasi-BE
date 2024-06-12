"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_studiPaten extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_studiPaten.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_studiPaten.init(
    {
      nomorPaten: DataTypes.STRING,
      judulPaten: DataTypes.STRING,
      filingDate: DataTypes.STRING,
      expiredDate: DataTypes.STRING,
      claimPaten: DataTypes.STRING,
      infringePaten: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
      StudiPraformulasiID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_studiPaten",
      freezeTableName: true,
    }
  );
  return t_studiPaten;
};
