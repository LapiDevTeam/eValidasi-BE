"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_totalSkoring extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_totalSkoring.belongsTo(models.t_proposalDiversifikasi, {
        foreignKey: "ProposalDiversifikasiID",
      });
    }
  }
  t_totalSkoring.init(
    {
      namaProduk: DataTypes.STRING,
      persentaseDalamFormula: DataTypes.FLOAT,
      pengaruhPadaPerformaProses: DataTypes.FLOAT,
      jumlahBetsPerTahun: DataTypes.FLOAT,
      jumlahTotal: DataTypes.FLOAT,
      keterangan: DataTypes.TEXT,
      ProposalDiversifikasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_totalSkoring",
      freezeTableName: true,
    }
  );
  return t_totalSkoring;
};
