"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_formulaCatatanTrial", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tujuanTrial: {
        type: Sequelize.TEXT,
      },
      tiapSediaan: {
        type: Sequelize.STRING,
      },
      besarBets: {
        type: Sequelize.INTEGER,
      },
      overmaat: {
        type: Sequelize.INTEGER,
      },
      satuan: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      kodeTrials: {
        type: Sequelize.JSONB,
      },
      detailFormula: {
        type: Sequelize.JSONB,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_catatanTrial",
          key: "id",
        },
      },
      user_id: {
        type: Sequelize.STRING,
      },
      delegated_to: {
        type: Sequelize.STRING,
      },
      flag_update: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_formulaCatatanTrial");
  },
};
