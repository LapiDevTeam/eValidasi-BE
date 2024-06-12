"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_pengamatanAwalPadat", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
        references: {
          model: "t_catatanTrial",
          key: "id",
        },
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
    await queryInterface.dropTable("t_pengamatanAwalPadat");
  },
};
