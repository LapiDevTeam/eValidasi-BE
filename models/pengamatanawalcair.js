"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PengamatanAwalCair extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PengamatanAwalCair.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  PengamatanAwalCair.init(
    {
      syaratPemerian: DataTypes.STRING,
      syaratPh: DataTypes.STRING,
      syaratBj: DataTypes.STRING,
      syaratViskositas: DataTypes.STRING,
      hasilPengujianPemerian: DataTypes.STRING,
      hasilPengujianPh: DataTypes.STRING,
      hasilPengujianBj: DataTypes.STRING,
      hasilPengujianViskositas: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "PengamatanAwalCair",
      freezeTableName: true,
    }
  );
  return PengamatanAwalCair;
};
