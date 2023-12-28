"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class StudiPaten extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      StudiPaten.belongsTo(models.StudiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  StudiPaten.init(
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
      modelName: "StudiPaten",
      freezeTableName: true,
    }
  );
  return StudiPaten;
};
