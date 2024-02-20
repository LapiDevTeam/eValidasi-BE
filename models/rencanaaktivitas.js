"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RencanaAktivitas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      RencanaAktivitas.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  RencanaAktivitas.init(
    {
      tersediaBahanAwal: DataTypes.STRING,
      optimasiFormulaDanProses: DataTypes.STRING,
      stabilitaSkalaLab: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RencanaAktivitas",
      freezeTableName: true,
    }
  );
  return RencanaAktivitas;
};
