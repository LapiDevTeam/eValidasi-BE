"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("CatatanTrial", {
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
      statusB: {
        type: Sequelize.STRING,
      },
      statusA: {
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
    await queryInterface.dropTable("CatatanTrial");
  },
};
