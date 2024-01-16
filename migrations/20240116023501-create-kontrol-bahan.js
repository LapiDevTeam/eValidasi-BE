"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("KontrolBahan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      namaBahan: {
        type: Sequelize.STRING,
      },
      parameter1: {
        type: Sequelize.STRING,
      },
      parameter2: {
        type: Sequelize.STRING,
      },
      parameter3: {
        type: Sequelize.STRING,
      },
      UjiInkompatibilitasID: {
        type: Sequelize.INTEGER,
        references: {
          model: "UjiInkompatibilitas",
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
    await queryInterface.dropTable("KontrolBahan");
  },
};
