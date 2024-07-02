"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_cqa", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      qttpElements: {
        type: Sequelize.STRING,
      },
      target: {
        type: Sequelize.STRING,
      },
      safety: {
        type: Sequelize.STRING,
      },
      efficacy: {
        type: Sequelize.STRING,
      },
      formulaDanProses: {
        type: Sequelize.STRING,
      },
      apakahIniKritikalCqa: {
        type: Sequelize.STRING,
      },
      justifikasi: {
        type: Sequelize.STRING,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_studiPraformulasi",
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
    await queryInterface.dropTable("t_cqa");
  },
};
