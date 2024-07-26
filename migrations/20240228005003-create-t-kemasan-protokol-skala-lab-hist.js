"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_kemasanProtokolSkalaLab_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      parameterBentukSediaan: {
        type: Sequelize.TEXT,
      },
      samaDenganOriginatorAtauKompetitorBentukSediaan: {
        type: Sequelize.STRING,
      },
      justifikasiBentukSediaan: {
        type: Sequelize.TEXT,
      },
      detailSediaan: {
        type: Sequelize.JSONB,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable("t_kemasanProtokolSkalaLab_hist");
  },
};
