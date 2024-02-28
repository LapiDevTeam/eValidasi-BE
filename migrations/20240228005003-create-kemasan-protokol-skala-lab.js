"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("KemasanProtokolSkalaLab", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      parameterBentukSediaan: {
        type: Sequelize.STRING,
      },
      samaDenganOriginatorAtauKompetitorBentukSediaan: {
        type: Sequelize.STRING,
      },
      justifikasiBentukSediaan: {
        type: Sequelize.STRING,
      },
      detailSediaan: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("KemasanProtokolSkalaLab");
  },
};
