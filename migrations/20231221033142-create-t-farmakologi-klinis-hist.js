"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_farmakologiKlinis_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      indikasi: {
        type: Sequelize.TEXT,
      },
      mekanismeAksi: {
        type: Sequelize.TEXT,
      },
      efekSamping: {
        type: Sequelize.TEXT,
      },
      absorpsi: {
        type: Sequelize.TEXT,
      },
      distribusi: {
        type: Sequelize.TEXT,
      },
      metabolisme: {
        type: Sequelize.TEXT,
      },
      eliminasi: {
        type: Sequelize.TEXT,
      },
      sumberPustaka: {
        type: Sequelize.TEXT,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable("t_farmakologiKlinis_hist");
  },
};
