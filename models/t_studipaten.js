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
      nomorPaten: DataTypes.TEXT,
      judulPaten: DataTypes.TEXT,
      filingDate: DataTypes.TEXT,
      expiredDate: DataTypes.TEXT,
      claimPaten: DataTypes.TEXT,
      infringePaten: DataTypes.TEXT,
      sumberPustaka: DataTypes.TEXT,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_studiPaten",
      freezeTableName: true,
    }
  );
  return t_studiPaten;
};
