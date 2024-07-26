"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class t_formulaProtokol extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      t_formulaProtokol.belongsTo(models.t_studiPraformulasi, {
        foreignKey: "StudiPraformulasiID",
      });
    }
  }
  t_formulaProtokol.init(
    {
      komposisi: DataTypes.STRING,
      fungsi: DataTypes.STRING,
      apakahAdaPadaKomposisiOriginatorKompetitor: DataTypes.STRING,
      justifikasi: DataTypes.TEXT,
      StudiPraformulasiID: DataTypes.INTEGER,
      user_id: DataTypes.STRING,
      delegated_to: DataTypes.STRING,
      flag_update: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "t_formulaProtokol",
      freezeTableName: true,
    }
  );
  return t_formulaProtokol;
};
