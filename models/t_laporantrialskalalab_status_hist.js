"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_laporanTrialSkalaLab_status_hist extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
 
    }
  }
  t_laporanTrialSkalaLab_status_hist.init(
    {
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      approver_no: DataTypes.INTEGER,
      is_approve: DataTypes.BOOLEAN,
      approver_name: DataTypes.STRING,
      approver_joblevel_id: DataTypes.STRING,
      approver_inisial: DataTypes.STRING,
      keterangan_reject: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_laporanTrialSkalaLab_status_hist",
      freezeTableName: true,
    }
  );
  return t_laporanTrialSkalaLab_status_hist;
};
