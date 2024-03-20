"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PengamatanLanjutan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      PengamatanLanjutan.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  PengamatanLanjutan.init(
    {
      kodeTrialHeaders: DataTypes.JSONB,
      content: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "PengamatanLanjutan",
      freezeTableName: true,
    }
  );
  return PengamatanLanjutan;
};
