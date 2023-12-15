"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StudiOriginator", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      deskripsiProduct: {
        type: Sequelize.JSONB,
      },
      farmalogiKlinis: {
        type: Sequelize.JSONB,
      },
      formula: {
        type: Sequelize.JSONB,
      },
      kemasan: {
        type: Sequelize.JSONB,
      },
      stabilita: {
        type: Sequelize.JSONB,
      },
      karakteristik: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("StudiOriginator");
  },
};
