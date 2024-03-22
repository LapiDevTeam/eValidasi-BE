"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ProsesCatatanTrialPenyalutan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tanggal: {
        type: Sequelize.STRING,
      },
      jam: {
        type: Sequelize.STRING,
      },
      turretSpeed: {
        type: Sequelize.STRING,
      },
      suhu: {
        type: Sequelize.STRING,
      },
      bobot: {
        type: Sequelize.STRING,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
        references: {
          model: "CatatanTrial",
          key: "id",
        },
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
    await queryInterface.dropTable("ProsesCatatanTrialPenyalutan");
  },
};
