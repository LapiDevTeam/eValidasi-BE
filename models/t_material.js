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
      t_material.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_material.init(
    {
      jumlahPenelitianAnalisaMaterial: DataTypes.STRING,
      kebutuhanAnalisaMaterial: DataTypes.FLOAT,
      biayaAnalisaMaterial: DataTypes.INTEGER,

      jumlahPenelitianOrientasiFormulaDanProses: DataTypes.STRING,
      kebutuhanOrientasiFormulaDanProses: DataTypes.FLOAT,
      biayaOrientasiFormulaDanProses: DataTypes.INTEGER,

      jumlahPenelitianOptimasiFormulaDanProses: DataTypes.STRING,
      kebutuhanOptimasiFormulaDanProses: DataTypes.FLOAT,
      biayaOptimasiFormulaDanProses: DataTypes.INTEGER,

      jumlahPenelitianStabilitaSkalaLab: DataTypes.STRING,
      kebutuhanStabilitaSkalaLab: DataTypes.FLOAT,
      biayaStabilitaSkalaLab: DataTypes.INTEGER,

      jumlahPenelitianSampelPerTinggal: DataTypes.STRING,
      kebutuhanSampelPerTinggal: DataTypes.FLOAT,
      biayaSampelPerTinggal: DataTypes.INTEGER,

      totalKebutuhanMaterial: DataTypes.FLOAT,
      perkiraanHargaPembelianMaterial: DataTypes.INTEGER,
      source: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_material",
      freezeTableName: true,
    }
  );
  return t_material;
};
