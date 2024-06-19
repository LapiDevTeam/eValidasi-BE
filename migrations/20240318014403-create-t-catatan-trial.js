"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_catatanTrial", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tanggalTrial: {
        type: Sequelize.DATE,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      kodeTrial: {
        type: Sequelize.STRING,
      },
      trialKe: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      productKompetitor: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "Draft",
      },
      perhitunganBatasBahanTambahan: {
        type: Sequelize.TEXT,
      },
      pembahasan: {
        type: Sequelize.TEXT,
      },
      kesimpulan: {
        type: Sequelize.TEXT,
      },
      tindakLanjut: {
        type: Sequelize.TEXT,
      },
      filter: {
        type: Sequelize.STRING,
      },
      tipeCatatanTrial: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_catatanTrial");
  },
};
