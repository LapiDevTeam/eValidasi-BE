"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_studiPraformulasi_status_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
      },
      approver_no: {
        type: Sequelize.INTEGER,
      },
      is_approve: {
        type: Sequelize.BOOLEAN,
      },
      approver_name: {
        type: Sequelize.STRING,
      },
      approver_joblevel_id: {
        type: Sequelize.STRING,
      },
      approver_inisial: {
        type: Sequelize.STRING,
      },
      keterangan_reject: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("t_studiPraformulasi_status_hist");
  },
};
