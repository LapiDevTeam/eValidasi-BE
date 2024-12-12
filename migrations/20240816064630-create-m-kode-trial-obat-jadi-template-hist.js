"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("m_kodeTrialObatJadi_template_hist", {
      id: {
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
      user_approve: {
        type: Sequelize.STRING,
      },
      user_delegated: {
        type: Sequelize.STRING,
      },
      user_approve_date: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("m_kodeTrialObatJadi_template_hist");
  },
};
