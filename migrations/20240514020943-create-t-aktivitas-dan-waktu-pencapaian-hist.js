"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_aktivitasDanWaktuPencapaian_hist", {
        status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      rencanaTersediaBahanAwal: {
        type: Sequelize.STRING,
      },
      pencapaianTersediaBahanAwal: {
        type: Sequelize.STRING,
      },
      rencanaOptimasiFormula: {
        type: Sequelize.STRING,
      },
      pencapaianOptimasiFormula: {
        type: Sequelize.STRING,
      },
      rencanaStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      pencapaianStabilitaSkalaLab: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_aktivitasDanWaktuPencapaian_hist");
  },
};
