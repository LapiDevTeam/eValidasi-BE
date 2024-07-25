"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_kelengkapanDokumen extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_kelengkapanDokumen.belongsTo(models.t_proposalDiversifikasi, {
        foreignKey: "ProposalDiversifikasiID",
      });
    }
  }
  t_kelengkapanDokumen.init(
    {
      dokumen: DataTypes.STRING,
      kelengkapan: DataTypes.STRING,
      upload: DataTypes.JSONB,
      ProposalDiversifikasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_kelengkapanDokumen",
      freezeTableName: true,
    }
  );
  return t_kelengkapanDokumen;
};
