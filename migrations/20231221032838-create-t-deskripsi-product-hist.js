"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_deskripsiProduct_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      namaStudi: {
        type: Sequelize.TEXT,
      },
      namaProduk: {
        type: Sequelize.TEXT,
      },
      manufacturer: {
        type: Sequelize.TEXT,
      },
      bentukSediaan: {
        type: Sequelize.TEXT,
      },
      dosage: {
        type: Sequelize.TEXT,
      },
      labelClaim: {
        type: Sequelize.TEXT,
      },
      rutePemberian: {
        type: Sequelize.TEXT,
      },
      aturanPakai: {
        type: Sequelize.TEXT,
      },
      sumberPustaka: {
        type: Sequelize.TEXT,
      },
      note: {
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
    await queryInterface.dropTable("t_deskripsiProduct_hist");
  },
};
