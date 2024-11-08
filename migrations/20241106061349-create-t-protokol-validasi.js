"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_protokolValidasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      jenisDokumen: {
        type: Sequelize.STRING,
      },
      filter: {
        type: Sequelize.STRING,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      noDokumen: {
        type: Sequelize.STRING,
      },
      revisi: {
        type: Sequelize.STRING,
      },
      alasan: {
        type: Sequelize.TEXT,
      },
      upload: {
        type: Sequelize.BLOB,
      },
      statusDokumen: {
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
    await queryInterface.dropTable("t_protokolValidasi");
  },
};
