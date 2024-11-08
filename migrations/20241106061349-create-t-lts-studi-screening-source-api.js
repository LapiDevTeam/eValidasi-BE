"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_LTS_studiScreeningSourceApi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      permasalahan: {
        type: Sequelize.TEXT,
      },
      tujuan: {
        type: Sequelize.TEXT,
      },
      skalaStudi: {
        type: Sequelize.TEXT,
      },
      penyimpananSampel: {
        type: Sequelize.TEXT,
      },
      tahapanStudi: {
        type: Sequelize.TEXT,
      },
      LaporanTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_LTS_studiScreeningSourceApi",
          key: "id",
        },
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
    await queryInterface.dropTable("t_LTS_studiScreeningSourceApi");
  },
};
