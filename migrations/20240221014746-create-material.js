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
      biayaAnalisaMaterial: {
        type: Sequelize.STRING,
      },
      jumlahPenelitianOrientasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      biayaOrientasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      jumlahPenelitianOptimasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      biayaOptimasiFormulaDanProses: {
        type: Sequelize.STRING,
      },
      jumlahPenelitianStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      biayaStabilitaSkalaLab: {
        type: Sequelize.STRING,
      },
      totalKebutuhanMaterial: {
        type: Sequelize.STRING,
      },
      perkiraanHargaPembelianMaterial: {
        type: Sequelize.STRING,
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
