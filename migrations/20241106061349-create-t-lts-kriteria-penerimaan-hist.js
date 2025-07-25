"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_LTS_kriteriaPenerimaan_hist", {
          status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      parameter: {
        type: Sequelize.TEXT,
      },
      spesifikasi: {
        type: Sequelize.TEXT,
      },
      referensi: {
        type: Sequelize.TEXT,
      },
      tableIndex: {
        type: Sequelize.TEXT,
      },
      LaporanTrialSkalaLabID: {
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
    await queryInterface.dropTable("t_LTS_kriteriaPenerimaan_hist");
  },
};
