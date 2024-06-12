"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_material extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_material.belongsTo(models.t_protokolTrialSkalaLab, {
        foreignKey: "ProtokolTrialSkalaLabID",
      });
    }
  }
  t_material.init(
    {
      jumlahPenelitianAnalisaMaterial: DataTypes.STRING,
      kebutuhanAnalisaMaterial: DataTypes.INTEGER,
      biayaAnalisaMaterial: DataTypes.INTEGER,

      jumlahPenelitianOrientasiFormulaDanProses: DataTypes.STRING,
      kebutuhanOrientasiFormulaDanProses: DataTypes.INTEGER,
      biayaOrientasiFormulaDanProses: DataTypes.INTEGER,

      jumlahPenelitianOptimasiFormulaDanProses: DataTypes.STRING,
      kebutuhanOptimasiFormulaDanProses: DataTypes.INTEGER,
      biayaOptimasiFormulaDanProses: DataTypes.INTEGER,

      jumlahPenelitianStabilitaSkalaLab: DataTypes.STRING,
      kebutuhanStabilitaSkalaLab: DataTypes.INTEGER,
      biayaStabilitaSkalaLab: DataTypes.INTEGER,

      jumlahPenelitianSampelPerTinggal: DataTypes.STRING,
      kebutuhanSampelPerTinggal: DataTypes.INTEGER,
      biayaSampelPerTinggal: DataTypes.INTEGER,

      totalKebutuhanMaterial: DataTypes.INTEGER,
      perkiraanHargaPembelianMaterial: DataTypes.INTEGER,
      source: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      ProtokolTrialSkalaLabID: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "t_material",
      freezeTableName: true,
    }
  );
  return t_material;
};
