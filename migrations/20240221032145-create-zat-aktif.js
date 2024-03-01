"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ZatAktif", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      materialAttributes: {
        type: Sequelize.STRING,
      },
      pengaruhKeCqa: {
        type: Sequelize.JSONB,
      },
      apakahVariabelDapatDimodifikasi: {
        type: Sequelize.STRING,
      },
      apakahTermasukCma: {
        type: Sequelize.STRING,
      },
      justifikasi: {
        type: Sequelize.STRING,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      ProtokolTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProtokolTrialSkalaLab",
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
    await queryInterface.dropTable("ZatAktif");
  },
};
