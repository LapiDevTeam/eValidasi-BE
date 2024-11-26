"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_proposalDiversifikasi_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      noProposal: {
        type: Sequelize.STRING,
      },
      rdSelection: {
        type: Sequelize.STRING,
      },
      namaBahanBaku: {
        type: Sequelize.STRING,
      },
      produsen: {
        type: Sequelize.STRING,
      },
      pemasok: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
      },
      alasan_reject: {
        type: Sequelize.STRING,
      },
      rancanganTrial: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("t_proposalDiversifikasi_hist");
  },
};
