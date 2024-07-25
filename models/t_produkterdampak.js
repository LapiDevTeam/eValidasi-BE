"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_produkTerdampak extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_produkTerdampak.belongsTo(models.t_proposalDiversifikasi, {
        foreignKey: "ProposalDiversifikasiID",
      });
    }
  }
  t_produkTerdampak.init(
    {
      namaProduk: DataTypes.STRING,
      keterangan: DataTypes.STRING,
      ProposalDiversifikasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_produkTerdampak",
      freezeTableName: true,
    }
  );
  return t_produkTerdampak;
};
