"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_proposalDiversifikasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_proposalDiversifikasi.hasMany(models.t_kelengkapanDokumen, {
        foreignKey: "ProposalDiversifikasiID",
      });
      t_proposalDiversifikasi.hasMany(models.t_produkTerdampak, {
        foreignKey: "ProposalDiversifikasiID",
      });
      t_proposalDiversifikasi.hasMany(models.t_persentaseDalamFormula, {
        foreignKey: "ProposalDiversifikasiID",
      });
    }
  }
  t_proposalDiversifikasi.init(
    {
      namaBahanBaku: DataTypes.STRING,
      produsen: DataTypes.STRING,
      pemasok: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_proposalDiversifikasi",
      freezeTableName: true,
    }
  );
  return t_proposalDiversifikasi;
};
