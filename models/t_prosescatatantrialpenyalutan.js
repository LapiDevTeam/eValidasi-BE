"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_prosesCatatanTrialPenyalutan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_prosesCatatanTrialPenyalutan.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_prosesCatatanTrialPenyalutan.init(
    {
      tanggal: DataTypes.STRING,
      jam: DataTypes.STRING,
      turretSpeed: DataTypes.STRING,
      suhu: DataTypes.STRING,
      bobot: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_prosesCatatanTrialPenyalutan",
      freezeTableName: true,
    }
  );
  return t_prosesCatatanTrialPenyalutan;
};
