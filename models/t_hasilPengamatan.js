'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class t_hasilPengamatan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association
      t_hasilPengamatan.belongsTo(models.t_laporanTrialSkalaLab, {
        foreignKey: 'LaporanTrialSkalaLabID',
      });
    }
  }
  t_hasilPengamatan.init(
    {
      LaporanTrialSkalaLabID: DataTypes.INTEGER,
      title: DataTypes.TEXT,
      tableIndex: DataTypes.INTEGER,
      colIndex: DataTypes.INTEGER,
      rowIndex: DataTypes.INTEGER,
      path: DataTypes.STRING,
      parameter: DataTypes.TEXT,
      desc: DataTypes.TEXT,
      waktuPengamatan: DataTypes.TEXT,
      tanggal: DataTypes.TEXT,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 't_hasilPengamatan',
      freezeTableName: true,
    }
  );
  return t_hasilPengamatan;
};
