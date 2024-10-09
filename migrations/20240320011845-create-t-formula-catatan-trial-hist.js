"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_formulaCatatanTrial_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
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
      notes: {
        type: Sequelize.TEXT,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_formulaCatatanTrial_hist");
  },
};
