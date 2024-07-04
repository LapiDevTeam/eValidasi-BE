"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_material_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      jumlahPenelitianAnalisaMaterial: {
        type: Sequelize.STRING,
      },
      kebutuhanAnalisaMaterial: {
        type: Sequelize.INTEGER,
      },
      biayaAnalisaMaterial: {
        type: Sequelize.INTEGER,
      },
      jumlahPenelitianOrientasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      kebutuhanOrientasiFormulaDanProses: {
        type: Sequelize.INTEGER,
      },
      biayaOrientasiFormulaDanProses: {
        type: Sequelize.INTEGER,
      },
      jumlahPenelitianOptimasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      kebutuhanOptimasiFormulaDanProses: {
        type: Sequelize.INTEGER,
      },
      biayaOptimasiFormulaDanProses: {
        type: Sequelize.INTEGER,
      },

      jumlahPenelitianStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      kebutuhanStabilitaSkalaLab: {
        type: Sequelize.INTEGER,
      },
      biayaStabilitaSkalaLab: {
        type: Sequelize.INTEGER,
      },
      jumlahPenelitianSampelPerTinggal: {
        type: Sequelize.STRING,
      },
      kebutuhanSampelPerTinggal: {
        type: Sequelize.INTEGER,
      },
      biayaSampelPerTinggal: {
        type: Sequelize.INTEGER,
      },
      totalKebutuhanMaterial: {
        type: Sequelize.INTEGER,
      },
      perkiraanHargaPembelianMaterial: {
        type: Sequelize.INTEGER,
      },
      source: {
        type: Sequelize.STRING,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      StudiPraformulasiID: {
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
    await queryInterface.dropTable("t_material_hist");
  },
};
