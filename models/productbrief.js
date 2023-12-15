"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ProductBrief extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifeScycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProductBrief.hasMany(models.StudiPraformulasi, {
        foreignKey: "ProductBriefId",
      });
    }
  }
  ProductBrief.init(
    {
      productBrief: DataTypes.STRING,
      kode: DataTypes.STRING,
      nama: DataTypes.STRING,
      kemasan: DataTypes.STRING,
      bentukSediaan: DataTypes.STRING,
      ruangLingkup: DataTypes.STRING,
      bahanAktifDanDosis: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: "ProductBrief",
      freezeTableName: true,
    }
  );
  return ProductBrief;
};
