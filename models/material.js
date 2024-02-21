"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Material extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Material.belongsTo(models.ProtokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  Material.init(
    {
      jumlahPenelitianAnalisaMaterial: DataTypes.STRING,
      biayaAnalisaMaterial: DataTypes.STRING,
      jumlahPenelitianOrientasiFormulaDanProses: DataTypes.STRING,
      biayaOrientasiFormulaDanProses: DataTypes.STRING,
      jumlahPenelitianOptimasiFormulaDanProses: DataTypes.STRING,
      biayaOptimasiFormulaDanProses: DataTypes.STRING,
      jumlahPenelitianStabilitaSkalaLab: DataTypes.STRING,
      biayaStabilitaSkalaLab: DataTypes.STRING,
      totalKebutuhanMaterial: DataTypes.STRING,
      perkiraanHargaPembelianMaterial: DataTypes.STRING,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Material",
      freezeTableName: true,
    }
  );
  return Material;
};
