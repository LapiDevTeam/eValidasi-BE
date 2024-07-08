"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_studiPraformulasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_studiPraformulasi.belongsTo(models.t_productBrief, {
        foreignKey: "ProductBriefId",
      });
      t_studiPraformulasi.hasMany(models.t_deskripsiProduct, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_farmakologiKlinis, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_formula, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_stabilita, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_studiPaten, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_qtpp, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_cqa, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_formulaProtokol, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_prosesPembuatan, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_kemasanProtokolSkalaLab, {
        foreignKey: "StudiPraformulasiID",
      });

      t_studiPraformulasi.hasMany(models.t_zatAktif, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_bahanTambahan, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_kemasanPrimer, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_cpp, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_rencanaAktivitas, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_originatorAtauKompetitor, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_material, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_kebutuhanPeralatanDanMesin, {
        foreignKey: "StudiPraformulasiID",
      });
      t_studiPraformulasi.hasMany(models.t_studiPraformulasi_status, {
        foreignKey: "StudiPraformulasiID",
        as: "approver_data",
      });
    }
  }
  t_studiPraformulasi.init(
    {
      nomor: DataTypes.STRING,
      tanggalPenyusunan: DataTypes.DATE,
      tanggalAddendum: DataTypes.DATE,
      addendumKe: DataTypes.INTEGER,
      namaProduk: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      kemasan: DataTypes.STRING,
      alasan: DataTypes.STRING,
      tujuan: DataTypes.STRING,
      productBriefNo: DataTypes.STRING,
      ProductBriefId: DataTypes.INTEGER,
      kesimpulan: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      rdSelection: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
      is_approve_1: DataTypes.STRING,
      approver_name_1: DataTypes.STRING,
      approver_user_id_1: DataTypes.STRING,
      approver_delegated_to_1: DataTypes.STRING,
      approver_tanggal_1: DataTypes.DATE,
      keterangan_reject_1: DataTypes.STRING,
      is_approve_2: DataTypes.STRING,
      approver_name_2: DataTypes.STRING,
      approver_user_id_2: DataTypes.STRING,
      approver_delegated_to_2: DataTypes.STRING,
      approver_tanggal_2: DataTypes.DATE,
      keterangan_reject_2: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_studiPraformulasi",
      freezeTableName: true,
    }
  );
  return t_studiPraformulasi;
};
