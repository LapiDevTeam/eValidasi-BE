"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_mappingProcess", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      processParameters: {
        type: Sequelize.TEXT,
      },
      materialAttributes: {
        type: Sequelize.TEXT,
      },
      manufacturingProcess: {
        type: Sequelize.STRING,
      },
      qualityAttributes: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("t_mappingProcess");
  },
};
