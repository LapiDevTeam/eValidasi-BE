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
      pengamatanAwalCair: DataTypes.JSONB,
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
