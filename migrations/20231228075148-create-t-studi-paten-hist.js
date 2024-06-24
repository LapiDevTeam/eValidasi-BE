"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_studiPaten_hist", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nomorPaten: {
        type: Sequelize.STRING,
      },
      judulPaten: {
        type: Sequelize.STRING,
      },
      filingDate: {
        type: Sequelize.STRING,
      },
      expiredDate: {
        type: Sequelize.STRING,
      },
      claimPaten: {
        type: Sequelize.STRING,
      },
      infringePaten: {
        type: Sequelize.STRING,
      },
      sumberPustaka: {
        type: Sequelize.STRING,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_studiPraformulasi_hist",
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
    await queryInterface.dropTable("t_studiPaten_hist");
  },
};
