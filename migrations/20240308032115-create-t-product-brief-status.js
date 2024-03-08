"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_productBrief_status", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      ProductBriefId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductBrief",
          key: "id",
        },
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
    await queryInterface.dropTable("t_productBrief_status");
  },
};
