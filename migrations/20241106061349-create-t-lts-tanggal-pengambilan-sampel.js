"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_LTS_tanggalPengambilanSampel", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      no: {
        type: Sequelize.TEXT,
      },
      namaBahanBaku: {
        type: Sequelize.TEXT,
      },
      bn: {
        type: Sequelize.TEXT,
      },
      md: {
        type: Sequelize.TEXT,
      },
      ed: {
        type: Sequelize.TEXT,
      },
      tanggalMulaiStudi: {
        type: Sequelize.TEXT,
      },
      waktuSampling: {
        type: Sequelize.TEXT,
      },
      kondisi: {
        type: Sequelize.TEXT,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      LaporanTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_laporanTrialSkalaLab",
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
    await queryInterface.dropTable("t_LTS_tanggalPengambilanSampel");
  },
};
