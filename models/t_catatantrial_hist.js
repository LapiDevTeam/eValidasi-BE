"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_catatanTrial_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_catatanTrial_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      tanggalTrial: DataTypes.DATE,
      namaProduk: DataTypes.STRING,
      kodeTrial: DataTypes.TEXT,
      trialKe: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      productKompetitor: DataTypes.STRING,
      statusDokumen: DataTypes.STRING,
      perhitunganBatasBahanTambahan: DataTypes.TEXT,
      pembahasan: DataTypes.TEXT,
      kesimpulan: DataTypes.TEXT,
      tindakLanjut: DataTypes.TEXT,
      filter: DataTypes.STRING,
      tipeCatatanTrial: DataTypes.STRING,
      bagian: DataTypes.STRING,
      is_approve_1: DataTypes.STRING,
      approver_name_1: DataTypes.STRING,
      approver_user_id_1: DataTypes.STRING,
      approver_delegated_to_1: DataTypes.STRING,
      approver_tanggal_1: DataTypes.DATE,
      keterangan_reject_1: DataTypes.STRING,
      // is_approve_2: DataTypes.STRING,
      // approver_name_2: DataTypes.STRING,
      // approver_user_id_2: DataTypes.STRING,
      // approver_delegated_to_2: DataTypes.STRING,
      // approver_tanggal_2: DataTypes.DATE,
      // keterangan_reject_2: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      upload: DataTypes.JSONB,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_catatanTrial_hist",
      freezeTableName: true,
    }
  );
  return t_catatanTrial_hist;
};
