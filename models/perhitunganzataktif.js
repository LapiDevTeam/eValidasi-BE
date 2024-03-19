"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PerhitunganZatAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PerhitunganZatAktif.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  PerhitunganZatAktif.init(
    {
      padaEtiket: DataTypes.STRING,
      bahanBakuYangDigunakan: DataTypes.STRING,
      perhitunganBahanBaku: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "PerhitunganZatAktif",
      freezeTableName: true,
    }
  );
  return PerhitunganZatAktif;
};
