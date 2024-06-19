"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_qtpp", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      targetBentukSediaan: {
        type: Sequelize.STRING,
      },
      justifikasiBentukSediaan: {
        type: Sequelize.STRING,
      },
      detailSediaan: {
        type: Sequelize.JSONB,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      ProtokolTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_protokolTrialSkalaLab",
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
    await queryInterface.dropTable("t_qtpp");
  },
};
