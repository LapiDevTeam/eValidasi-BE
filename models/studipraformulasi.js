"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class StudiPraformulasi extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      StudiPraformulasi.belongsTo(models.ProductBrief, {
        foreignKey: "ProductBriefId",
      });
    }
  }
  StudiPraformulasi.init(
    {
      tanggalAddendum: DataTypes.DATE,
      addendumKe: DataTypes.INTEGER,
      namaProduk: DataTypes.STRING,
      komposisi: DataTypes.STRING,
      kemasan: DataTypes.STRING,
      alasan: DataTypes.STRING,
      tujuan: DataTypes.STRING,
      productBriefNo: DataTypes.STRING,
      studiOriginatorId: DataTypes.INTEGER,
      studiLiterature: DataTypes.JSONB,
      studiPaten: DataTypes.JSONB,
      ujiKompatibilitas: DataTypes.JSONB,
      kesimpulan: DataTypes.STRING,
      ProductBriefId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "StudiPraformulasi",
      freezeTableName: true,
    }
  );
  return StudiPraformulasi;
};
