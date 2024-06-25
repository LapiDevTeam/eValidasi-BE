"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_pengamatanAwalPenyalutan_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  t_pengamatanAwalPenyalutan_hist.init(
    {
      status: DataTypes.STRING,
      changeDate: DataTypes.DATE,
      spesifikasiWeightGain: DataTypes.STRING,
      settingWeightGain: DataTypes.STRING,
      evaluasiWeightGain: DataTypes.STRING,
      spesifikasiPemerian: DataTypes.STRING,
      settingPemerian: DataTypes.STRING,
      evaluasiPemerian: DataTypes.STRING,
      spesifikasiKeseragamanBobot: DataTypes.STRING,
      settingKeseragamanBobot: DataTypes.STRING,
      evaluasiKeseragamanBobot: DataTypes.STRING,
      spesifikasiKetebalan: DataTypes.STRING,
      settingKetebalan: DataTypes.STRING,
      evaluasiKetebalan: DataTypes.JSONB,
      rataRataKetebalan: DataTypes.STRING,
      spesifikasiDimensi: DataTypes.STRING,
      settingDimensi: DataTypes.STRING,
      evaluasiDimensi: DataTypes.STRING,
      spesifikasiWaktuHancur: DataTypes.STRING,
      settingWaktuHancur: DataTypes.STRING,
      evaluasiWaktuHancur: DataTypes.STRING,
      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_pengamatanAwalPenyalutan_hist",
      freezeTableName: true,
    }
  );
  return t_pengamatanAwalPenyalutan_hist;
};
