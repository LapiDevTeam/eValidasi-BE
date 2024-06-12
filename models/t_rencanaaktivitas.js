"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_rencanaAktivitas extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_rencanaAktivitas.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_rencanaAktivitas.init(
    {
      tersediaBahanAwal: DataTypes.STRING,
      optimasiFormulaDanProses: DataTypes.STRING,
      stabilitaSkalaLab: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_rencanaAktivitas",
      freezeTableName: true,
    }
  );
  return t_rencanaAktivitas;
};
