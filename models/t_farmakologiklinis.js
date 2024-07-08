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
      indikasi: DataTypes.STRING,
      mekanismeAksi: DataTypes.STRING,
      efekSamping: DataTypes.STRING,
      absorpsi: DataTypes.STRING,
      distribusi: DataTypes.STRING,
      metabolisme: DataTypes.STRING,
      eliminasi: DataTypes.STRING,
      sumberPustaka: DataTypes.STRING,
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
