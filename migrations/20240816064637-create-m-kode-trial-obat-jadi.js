"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("m_kodeTrialObatJadi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kodeProduk: {
        type: Sequelize.STRING,
      },
      namaObatJadi: {
        type: Sequelize.STRING,
      },
      kemasan: {
        type: Sequelize.STRING,
      },
      komposisi: {
        type: Sequelize.JSONB,
      },
      keterangan: {
        type: Sequelize.TEXT,
      },
      flag_update: {
        type: Sequelize.STRING,
      },
      user_id: {
        type: Sequelize.STRING,
      },
      delegated_to: {
        type: Sequelize.STRING,
      },
      rencana_berlaku: {
        type: Sequelize.DATE,
      },
      rencana_revisi: {
        type: Sequelize.STRING,
      },
      rencana_alasan_desc: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable("m_kodeTrialObatJadi");
  },
};
