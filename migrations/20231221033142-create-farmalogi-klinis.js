"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("FarmalogiKlinis", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
    await queryInterface.dropTable("FarmalogiKlinis");
  },
};
