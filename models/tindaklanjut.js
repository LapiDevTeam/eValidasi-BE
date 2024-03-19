"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TindakLanjut extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      TindakLanjut.belongsTo(models.CatatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  TindakLanjut.init(
    {
      tindakLanjut: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "TindakLanjut",
      freezeTableName: true,
    }
  );
  return TindakLanjut;
};
