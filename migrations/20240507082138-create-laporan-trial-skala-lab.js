"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("LaporanTrialSkalaLab", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nomor: {
        type: Sequelize.STRING,
      },
      tanggal: {
        type: Sequelize.DATE,
      },
      revisi: {
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      komposisi: {
        type: Sequelize.JSONB,
      },
      kemasan: {
        type: Sequelize.STRING,
      },
      alasan: {
        type: Sequelize.STRING,
      },
      tujuan: {
        type: Sequelize.STRING,
      },
      productBriefNo: {
        type: Sequelize.STRING,
      },
      hasilStudiPraformulasiNo: {
        type: Sequelize.STRING,
      },
      protokolPenelitianNo: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      rdSelection: {
        type: Sequelize.STRING,
      },
      lainlain: {
        type: Sequelize.JSONB,
      },
      alasan_reject: {
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
    await queryInterface.dropTable("LaporanTrialSkalaLab");
  },
};
