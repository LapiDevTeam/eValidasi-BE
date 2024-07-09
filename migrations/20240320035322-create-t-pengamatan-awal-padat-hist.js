"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_pengamatanAwalPadat_hist", {
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
      spesifikasiKekerasanTablet: {
        type: Sequelize.STRING,
      },
      settingKekerasanTablet: {
        type: Sequelize.STRING,
      },
      evaluasiKekerasanTablet: {
        type: Sequelize.JSONB,
      },
      rataRataKekerasanTablet: {
        type: Sequelize.STRING,
      },
      spesifikasiKerapuhan: {
        type: Sequelize.STRING,
      },
      settingKerapuhan: {
        type: Sequelize.STRING,
      },
      evaluasiKerapuhan: {
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
      spesifikasiUkuran: {
        type: Sequelize.STRING,
      },
      settingUkuran: {
        type: Sequelize.STRING,
      },
      evaluasiUkuran: {
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
    await queryInterface.dropTable("t_pengamatanAwalPadat_hist");
  },
};
