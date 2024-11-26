"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_formulaFix_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      filter: {
        type: Sequelize.STRING,
      },
      komposisi: {
        type: Sequelize.JSONB,
      },
      kemasan: {
        type: Sequelize.STRING,
      },
      formulaAcuan: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      besarBets: {
        type: Sequelize.STRING,
      },
      revisi: {
        type: Sequelize.STRING,
      },
      alasan: {
        type: Sequelize.TEXT,
      },
      formulaA: {
        type: Sequelize.JSONB,
      },
      formulaB: {
        type: Sequelize.JSONB,
      },
      formulaC: {
        type: Sequelize.JSONB,
      },
      formulaD: {
        type: Sequelize.JSONB,
      },
      keterangan: {
        type: Sequelize.TEXT,
      },
      pic: {
        type: Sequelize.STRING,
      },
      bagian: {
        type: Sequelize.STRING,
      },
      alasan_reject: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_formulaFix_hist");
  },
};
