"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UpdateRiskAssessmentKemasan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      cqaHeader: {
        type: Sequelize.JSONB,
      },
      rows: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("UpdateRiskAssessmentKemasan");
  },
};
