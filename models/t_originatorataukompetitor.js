"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_originatorAtauKompetitor extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_originatorAtauKompetitor.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_originatorAtauKompetitor.init(
    {
      originator: DataTypes.STRING,
      source: DataTypes.STRING,
      harga: DataTypes.STRING,
      pemeriksaanFisikDanKimiaOriginator: DataTypes.STRING,
      profilDisolusi: DataTypes.STRING,
      stabilita: DataTypes.STRING,
      ujiBE: DataTypes.STRING,
      cadangan: DataTypes.STRING,
      totalKebutuhanMaterial: DataTypes.STRING,
      perkiraanHargaPembelianMaterial: DataTypes.STRING,
      tableIndex: DataTypes.INTEGER,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_originatorAtauKompetitor",
      freezeTableName: true,
    }
  );
  return t_originatorAtauKompetitor;
};
