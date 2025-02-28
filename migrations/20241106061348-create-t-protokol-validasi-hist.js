"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_protokolValidasi_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
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
        type: Sequelize.JSONB,
      },
      bagian: {
        type: Sequelize.STRING,
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_protokolValidasi_hist");
  },
};
