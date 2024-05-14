"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RingkasanHasilStudiCpp", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      prosesParameter: {
        type: Sequelize.STRING,
      },
      CqaYangDiStudi: {
        type: Sequelize.STRING,
      },
      rangeStudi: {
        type: Sequelize.STRING,
      },
      controlStrategy: {
        type: Sequelize.STRING,
      },
      justifikasi: {
        type: Sequelize.STRING,
      },
      LaporanTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "LaporanTrialSkalaLab",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
    await queryInterface.dropTable("RingkasanHasilStudiCpp");
  },
};
