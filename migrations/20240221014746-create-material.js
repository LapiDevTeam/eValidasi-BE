"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Material", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      ProtokolTrialSkalaLabID: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProtokolTrialSkalaLab",
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
    await queryInterface.dropTable("Material");
  },
};
