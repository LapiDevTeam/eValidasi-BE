"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_pengamatanAwalPadat extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_pengamatanAwalPadat.belongsTo(models.t_catatanTrial, {
        foreignKey: "CatatanTrialID",
      });
    }
  }
  t_pengamatanAwalPadat.init(
    {
      kodeTrial: DataTypes.STRING,
      spesifikasiPemerian: DataTypes.STRING,
      settingPemerian: DataTypes.STRING,
      evaluasiPemerian: DataTypes.STRING,
      bobotIsiCangkang: DataTypes.STRING,
      bobotIsiCangkangBending: DataTypes.STRING,
      spesifikasiKeseragamanBobot: DataTypes.STRING,
      spesifikasiKekerasanTablet: DataTypes.STRING,
      settingKekerasanTablet: DataTypes.STRING,
      evaluasiKekerasanTablet: DataTypes.JSONB,
      rataRataKekerasanTablet: DataTypes.STRING,
      spesifikasiWaktuHancur: DataTypes.STRING,
      settingWaktuHancur: DataTypes.STRING,
      evaluasiWaktuHancur: DataTypes.STRING,
      spesifikasiKerapuhan: DataTypes.STRING,
      settingKerapuhan: DataTypes.STRING,
      evaluasiKerapuhan: DataTypes.STRING,
      spesifikasiKetebalan: DataTypes.STRING,
      settingKetebalan: DataTypes.STRING,
      evaluasiKetebalan: DataTypes.JSONB,
      rataRataKetebalan: DataTypes.STRING,
      spesifikasiUkuran: DataTypes.STRING,
      settingUkuran: DataTypes.STRING,
      evaluasiUkuran: DataTypes.STRING,

      spesifikasiKeseragamanBobotKapsulKosong: DataTypes.STRING,
      spesifikasiKeseragamanBobotIsiKapsul: DataTypes.STRING,
      spesifikasiBobotIsiCangkang: DataTypes.STRING,
      spesifikasiBobotIsiCangkangBending: DataTypes.STRING,
      spesifikasiWaktuHancurKapsul: DataTypes.STRING,
      settingWaktuHancurKapsul: DataTypes.STRING,
      evaluasiWaktuHancurKapsul: DataTypes.STRING,
      spesifikasiPemerianIsiKapsul: DataTypes.STRING,
      settingPemerianIsiKapsul: DataTypes.STRING,
      evaluasiPemerianIsiKapsul: DataTypes.STRING,
      spesifikasiCangkangKapsulNo: DataTypes.STRING,
      settingCangkangKapsulNo: DataTypes.STRING,
      evaluasiCangkangKapsulNo: DataTypes.STRING,
      spesifikasiCap: DataTypes.STRING,
      settingCap: DataTypes.STRING,
      evaluasiCap: DataTypes.STRING,
      spesifikasiBody: DataTypes.STRING,
      settingBody: DataTypes.STRING,
      evaluasiBody: DataTypes.STRING,
      spesifikasiPenandaanCap: DataTypes.STRING,
      settingPenandaanCap: DataTypes.STRING,
      evaluasiPenandaanCap: DataTypes.STRING,
      spesifikasiPenandaanBody: DataTypes.STRING,
      settingPenandaanBody: DataTypes.STRING,
      evaluasiPenandaanBody: DataTypes.STRING,

      syaratWarna: DataTypes.STRING,
      hasilWarna: DataTypes.STRING,
      syaratBauAroma: DataTypes.STRING,
      hasilBauAroma: DataTypes.STRING,
      syaratRasa: DataTypes.STRING,
      hasilRasa: DataTypes.STRING,
      syaratPh: DataTypes.STRING,
      hasilPh: DataTypes.STRING,
      syaratBj: DataTypes.STRING,
      hasilBj: DataTypes.STRING,
      syaratViskositas: DataTypes.STRING,
      hasilViskositas: DataTypes.STRING,

      CatatanTrialID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_pengamatanAwalPadat",
      freezeTableName: true,
    }
  );
  return t_pengamatanAwalPadat;
};
