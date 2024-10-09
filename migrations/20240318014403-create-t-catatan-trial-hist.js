"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_catatanTrial_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      tanggalTrial: {
        type: Sequelize.DATE,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      kodeTrial: {
        type: Sequelize.TEXT,
      },
      trialKe: {
        type: Sequelize.STRING,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      productKompetitor: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
      },
      perhitunganBatasBahanTambahan: {
        type: Sequelize.TEXT,
      },
      pembahasan: {
        type: Sequelize.TEXT,
      },
      kesimpulan: {
        type: Sequelize.TEXT,
      },
      tindakLanjut: {
        type: Sequelize.TEXT,
      },
      filter: {
        type: Sequelize.STRING,
      },
      tipeCatatanTrial: {
        type: Sequelize.STRING,
      },
      bagian: {
        type: Sequelize.STRING,
      },
      is_approve_1: {
        type: Sequelize.STRING,
      },
      approver_name_1: {
        type: Sequelize.STRING,
      },
      approver_user_id_1: {
        type: Sequelize.STRING,
      },
      approver_delegated_to_1: {
        type: Sequelize.STRING,
      },
      approver_tanggal_1: {
        type: Sequelize.DATE,
      },
      keterangan_reject_1: {
        type: Sequelize.STRING,
      },
      // is_approve_2: {
      //   type: Sequelize.STRING,
      // },
      // approver_name_2: {
      //   type: Sequelize.STRING,
      // },
      // approver_user_id_2: {
      //   type: Sequelize.STRING,
      // },
      // approver_delegated_to_2: {
      //   type: Sequelize.STRING,
      // },
      // approver_tanggal_2: {
      //   type: Sequelize.DATE,
      // },
      // keterangan_reject_2: {
      //   type: Sequelize.STRING,
      // },
      alasan_reject: {
        type: Sequelize.STRING,
      },
      upload: {
        type: Sequelize.JSONB,
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
    await queryInterface.dropTable("t_catatanTrial_hist");
  },
};
