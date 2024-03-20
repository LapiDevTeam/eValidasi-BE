"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PengamatanLanjutan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kodeTrialHeaders: {
        type: Sequelize.JSONB,
      },
      content: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("PengamatanLanjutan");
  },
};
