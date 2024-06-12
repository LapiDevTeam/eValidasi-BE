"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_perhitunganZatAktif extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_perhitunganZatAktif.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_perhitunganZatAktif.init(
    {
      padaEtiket: DataTypes.STRING,
      bahanBakuYangDigunakan: DataTypes.STRING,
      perhitunganBahanBaku: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_perhitunganZatAktif",
      freezeTableName: true,
    }
  );
  return t_perhitunganZatAktif;
};
