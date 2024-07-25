"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_proposalDiversifikasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      namaBahanBaku: {
        type: Sequelize.STRING,
      },
      produsen: {
        type: Sequelize.STRING,
      },
      pemasok: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
        defaultValue: "Draft",
      },
      alasan_reject: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_proposalDiversifikasi");
  },
};
