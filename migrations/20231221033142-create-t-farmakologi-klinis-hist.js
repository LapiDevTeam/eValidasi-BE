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
        type: Sequelize.STRING,
      },
      mekanismeAksi: {
        type: Sequelize.STRING,
      },
      efekSamping: {
        type: Sequelize.STRING,
      },
      absorpsi: {
        type: Sequelize.STRING,
      },
      distribusi: {
        type: Sequelize.STRING,
      },
      metabolisme: {
        type: Sequelize.STRING,
      },
      eliminasi: {
        type: Sequelize.STRING,
      },
      sumberPustaka: {
        type: Sequelize.STRING,
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
