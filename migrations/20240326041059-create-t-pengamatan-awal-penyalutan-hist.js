"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_pengamatanAwalPenyalutan_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      kodeTrial: {
        type: Sequelize.STRING,
      },
      spesifikasiWeightGain: {
        type: Sequelize.STRING,
      },
      settingWeightGain: {
        type: Sequelize.STRING,
      },
      evaluasiWeightGain: {
        type: Sequelize.STRING,
      },
      spesifikasiPemerian: {
        type: Sequelize.STRING,
      },
      settingPemerian: {
        type: Sequelize.STRING,
      },
      evaluasiPemerian: {
        type: Sequelize.STRING,
      },
      spesifikasiKeseragamanBobot: {
        type: Sequelize.STRING,
      },
      settingKeseragamanBobot: {
        type: Sequelize.STRING,
      },
      evaluasiKeseragamanBobot: {
        type: Sequelize.STRING,
      },
      spesifikasiKetebalan: {
        type: Sequelize.STRING,
      },
      settingKetebalan: {
        type: Sequelize.STRING,
      },
      evaluasiKetebalan: {
        type: Sequelize.JSONB,
      },
      rataRataKetebalan: {
        type: Sequelize.STRING,
      },
      spesifikasiDimensi: {
        type: Sequelize.STRING,
      },
      settingDimensi: {
        type: Sequelize.STRING,
      },
      evaluasiDimensi: {
        type: Sequelize.STRING,
      },
      spesifikasiWaktuHancur: {
        type: Sequelize.STRING,
      },
      settingWaktuHancur: {
        type: Sequelize.STRING,
      },
      evaluasiWaktuHancur: {
        type: Sequelize.STRING,
      },
      CatatanTrialID: {
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_pengamatanAwalPenyalutan_hist");
  },
};
