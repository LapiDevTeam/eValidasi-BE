"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_laporanTrialSkalaLab_hist", {
        status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      nomor: {
        type: Sequelize.STRING,
      },
      tanggal: {
        type: Sequelize.DATE,
      },
      revisi: {
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      komposisi: {
        type: Sequelize.JSONB,
      },
      kemasan: {
        type: Sequelize.STRING,
      },
      alasan: {
        type: Sequelize.STRING,
      },
      tujuan: {
        type: Sequelize.STRING,
      },
      productBriefNo: {
        type: Sequelize.STRING,
      },
      hasilStudiPraformulasiNo: {
        type: Sequelize.STRING,
      },
      protokolPenelitianNo: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
      },
      rdSelection: {
        type: Sequelize.STRING,
      },
      lainlain: {
        type: Sequelize.JSONB,
      },
      permasalahan: {
        type: Sequelize.TEXT,
      },
      tujuan: {
        type: Sequelize.TEXT,
      },
      skalaStudi: {
        type: Sequelize.TEXT,
      },
      penyimpanganSampel: {
        type: Sequelize.TEXT,
      },
      tahapanStudi: {
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
      spesifikasiProdukJadi: {
        type: Sequelize.TEXT,
      },
      alasan_reject: {
        type: Sequelize.STRING,
      },
      pic: {
        type: Sequelize.STRING,
      },
      bagian: {
        type: Sequelize.STRING,
      },
      aktivitasDanWaktuPencapaian: {
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_laporanTrialSkalaLab_hist");
  },
};
