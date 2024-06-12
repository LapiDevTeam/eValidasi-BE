"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_pengamatanLanjutan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_pengamatanLanjutan.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_pengamatanLanjutan.init(
    {
      kodeTrialHeaders: DataTypes.JSONB,
      content: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_pengamatanLanjutan",
      freezeTableName: true,
    }
  );
  return t_pengamatanLanjutan;
};
