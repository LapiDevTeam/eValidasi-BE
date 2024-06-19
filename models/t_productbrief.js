"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_productBrief extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifeScycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_productBrief.hasMany(models.t_studiPraformulasi, {
        foreignKey: "ProductBriefId",
      });
      t_productBrief.hasMany(models.t_productBrief_status, {
        foreignKey: "ProductBriefId",
        as: "approver_data",
      });
    }
  }
  t_productBrief.init(
    {
      productBrief: DataTypes.STRING,
      kode: DataTypes.STRING,
      nama: DataTypes.STRING,
      kemasan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      ruangLingkup: DataTypes.STRING,
      bahanAktifDanDosis: DataTypes.JSONB,
      rdSelection: DataTypes.STRING,
      status: DataTypes.STRING,
      alasan_reject: DataTypes.STRING,
      upload: DataTypes.TEXT,
      revisi: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_productBrief",
      freezeTableName: true,
    }
  );
  return t_productBrief;
};
