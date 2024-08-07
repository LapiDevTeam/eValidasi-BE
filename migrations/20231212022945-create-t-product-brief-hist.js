"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_productBrief_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      productBrief: {
        type: Sequelize.STRING,
      },
      productBriefKey: {
        type: Sequelize.INTEGER,
      },
      kode: {
        type: Sequelize.STRING,
      },
      nama: {
        type: Sequelize.STRING,
      },
      kemasan: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      ruangLingkup: {
        type: Sequelize.STRING,
      },
      bahanAktifDanDosis: {
        type: Sequelize.JSONB,
      },
      rdSelection: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
      },
      alasan_reject: {
        type: Sequelize.STRING,
      },
      alasanDelete: {
        type: Sequelize.STRING,
      },
      upload: {
        type: Sequelize.JSON,
      },
      revisi: {
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
    await queryInterface.dropTable("t_productBrief_hist");
  },
};
