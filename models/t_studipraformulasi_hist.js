"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_studiPraformulasi_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_studiPraformulasi_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
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
      tujuanScreening: DataTypes.TEXT,
      kesimpulanScreening: DataTypes.TEXT,
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
      modelName: "t_studiPraformulasi_hist",
      freezeTableName: true,
    }
  );
  return t_studiPraformulasi_hist;
};
