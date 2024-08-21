"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class m_kodeTrialObatJadi_template extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  m_kodeTrialObatJadi_template.init(
    {
      kodeProduk: DataTypes.STRING,
      namaObatJadi: DataTypes.STRING,
      kemasan: DataTypes.STRING,
      komposisi: DataTypes.JSONB,
      keterangan: DataTypes.TEXT,
      flag_update: DataTypes.STRING,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      rencana_berlaku: DataTypes.DATE,
      rencana_revisi: DataTypes.STRING,
      rencana_alasan_desc: DataTypes.TEXT,
      user_approve: DataTypes.STRING,
      user_delegated: DataTypes.STRING,
      user_approve_date: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "m_kodeTrialObatJadi_template",
      freezeTableName: true,
    }
  );
  return m_kodeTrialObatJadi_template;
};
