"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PengamatanAwalSteril extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PengamatanAwalSteril.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  PengamatanAwalSteril.init(
    {
      syaratPemerian: DataTypes.STRING,
      hasilPengujianPemerian: DataTypes.STRING,
      syaratPh: DataTypes.STRING,
      hasilPengujianPh: DataTypes.STRING,
      syaratBj: DataTypes.STRING,
      hasilPengujianBj: DataTypes.STRING,
      syaratOsmolaritas: DataTypes.STRING,
      hasilPengujianOsmolaritas: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "PengamatanAwalSteril",
      freezeTableName: true,
    }
  );
  return PengamatanAwalSteril;
};
