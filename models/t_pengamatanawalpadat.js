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
      spesifikasiKeseragamanBobot: DataTypes.STRING,
      spesifikasiKekerasanTablet: DataTypes.STRING,
      settingKekerasanTablet: DataTypes.STRING,
      evaluasiKekerasanTablet: DataTypes.JSONB,
      rataRataKekerasanTablet: DataTypes.STRING,
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
