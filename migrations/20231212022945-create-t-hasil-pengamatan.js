"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_hasilPengamatan", {
      id: {
        type: Sequelize.STRING,
        unique: true,
        primaryKey: true
      },
      LaporanTrialSkalaLabID: {
        type: Sequelize.INTEGER,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      colIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      rowIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      parameter: {
        type: Sequelize.TEXT,
      },
      desc: {
        type: Sequelize.TEXT,
      },
      waktuPengamatan: {
        type: Sequelize.TEXT,
      },
      tanggal: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("t_hasilPengamatan");
  },
};
