"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_deskripsiProduct", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
        references: {
          model: "t_studiPraformulasi",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
    await queryInterface.dropTable("t_deskripsiProduct");
  },
};
