"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_LTS_hasilPengamatan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      waktuPengamatan: {
        type: Sequelize.TEXT,
      },
      tanggal: {
        type: Sequelize.TEXT,
      },
      title: {
        type: Sequelize.JSONB,
      },
      content: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("t_LTS_hasilPengamatan");
  },
};
