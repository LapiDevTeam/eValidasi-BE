"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_farmakologiKlinis extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_farmakologiKlinis.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_farmakologiKlinis.init(
    {
      indikasi: DataTypes.TEXT,
      mekanismeAksi: DataTypes.TEXT,
      efekSamping: DataTypes.TEXT,
      absorpsi: DataTypes.TEXT,
      distribusi: DataTypes.TEXT,
      metabolisme: DataTypes.TEXT,
      eliminasi: DataTypes.TEXT,
      sumberPustaka: DataTypes.TEXT,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_farmakologiKlinis",
      freezeTableName: true,
    }
  );
  return t_farmakologiKlinis;
};
