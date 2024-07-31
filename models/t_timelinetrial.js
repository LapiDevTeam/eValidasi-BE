"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_timelineTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_timelineTrial.belongsTo(models.t_proposalDiversifikasi, {
        foreignKey: "ProposalDiversifikasiID",
      });
    }
  }
  t_timelineTrial.init(
    {
      dampakPerubahan: DataTypes.TEXT,
      pic: DataTypes.STRING,
      prioritas: DataTypes.STRING,
      tenggatWaktu: DataTypes.DATE,
      realisasi: DataTypes.TEXT,
      realisasiDate: DataTypes.DATE,
      statusImplementasi: DataTypes.STRING,
      ProposalDiversifikasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_timelineTrial",
      freezeTableName: true,
    }
  );
  return t_timelineTrial;
};
