"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ProtokolTrialSkalaLab", {
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
      lainlain: {
        type: Sequelize.JSONB,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "Draft",
      },
      rdSelection: {
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
    await queryInterface.dropTable("ProtokolTrialSkalaLab");
  },
};
