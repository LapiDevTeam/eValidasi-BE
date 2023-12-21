"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("DeskripsiProduct", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      judul: {
        type: Sequelize.STRING,
      },
      namaStudi: {
        type: Sequelize.STRING,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      manufacturer: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      dosageDesign: {
        type: Sequelize.STRING,
      },
      labelClaim: {
        type: Sequelize.STRING,
      },
      rutePemberian: {
        type: Sequelize.STRING,
      },
      aturanPakai: {
        type: Sequelize.STRING,
      },
      sumberPustaka: {
        type: Sequelize.STRING,
      },
      note: {
        type: Sequelize.STRING,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "StudiPraformulasi",
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
    await queryInterface.dropTable("DeskripsiProduct");
  },
};
