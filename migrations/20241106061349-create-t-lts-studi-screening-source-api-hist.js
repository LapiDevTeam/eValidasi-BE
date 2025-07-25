"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_LTS_studiScreeningSourceApi_hist", {
         status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      permasalahan: {
        type: Sequelize.TEXT,
      },
      tujuan: {
        type: Sequelize.TEXT,
      },
      skalaStudi: {
        type: Sequelize.TEXT,
      },
      penyimpananSampel: {
        type: Sequelize.TEXT,
      },
      tahapanStudi: {
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
    await queryInterface.dropTable("t_LTS_studiScreeningSourceApi_hist");
  },
};
