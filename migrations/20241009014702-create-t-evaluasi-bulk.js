"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_evaluasiBulk", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      noFormula: {
        type: Sequelize.TEXT,
      },
      bulkDensity: {
        type: Sequelize.TEXT,
      },
      tappedDensity: {
        type: Sequelize.TEXT,
      },
      carrIndex: {
        type: Sequelize.TEXT,
      },
      interpretasiHasil: {
        type: Sequelize.TEXT,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_catatanTrial",
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
    await queryInterface.dropTable("t_evaluasiBulk");
  },
};
