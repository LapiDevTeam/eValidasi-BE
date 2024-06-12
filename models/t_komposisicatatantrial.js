"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_komposisiCatatanTrial extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_komposisiCatatanTrial.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_komposisiCatatanTrial.init(
    {
      kode: DataTypes.STRING,
      namaBahanBaku: DataTypes.STRING,
      principle: DataTypes.STRING,
      jumlahTiapSediaan: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_komposisiCatatanTrial",
      freezeTableName: true,
    }
  );
  return t_komposisiCatatanTrial;
};
