"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AktivitasDanWaktuPencapaian", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      rencanaTersediaBahanAwal: {
        type: Sequelize.STRING,
      },
      pencapaianTersediaBahanAwal: {
        type: Sequelize.STRING,
      },
      rencanaOptimasiFormula: {
        type: Sequelize.STRING,
      },
      pencapaianOptimasiFormula: {
        type: Sequelize.STRING,
      },
      rencanaStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      pencapaianStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      LaporanTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "LaporanTrialSkalaLab",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
    await queryInterface.dropTable("AktivitasDanWaktuPencapaian");
  },
};
