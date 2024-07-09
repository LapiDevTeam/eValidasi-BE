"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_pengamatanAwalCair extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_pengamatanAwalCair.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_pengamatanAwalCair.init(
    {
      kodeTrial: DataTypes.STRING,
      pengamatanAwalCair: DataTypes.JSONB,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_pengamatanAwalCair",
      freezeTableName: true,
    }
  );
  return t_pengamatanAwalCair;
};
