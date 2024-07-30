"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_kemasan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      manufacturer: {
        type: Sequelize.STRING,
      },
      noBatch: {
        type: Sequelize.STRING,
      },
      tanggalProduksi: {
        type: Sequelize.STRING,
      },
      tanggalKadarluarsa: {
        type: Sequelize.STRING,
      },
      sumberPustaka: {
        type: Sequelize.TEXT,
      },
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      jenisKemasPrimer: {
        type: Sequelize.TEXT,
      },
      hasilUjiKemasPrimer: {
        type: Sequelize.TEXT,
      },
      jenisKemasSekunder: {
        type: Sequelize.TEXT,
      },
      hasilUjiKemasSekunder: {
        type: Sequelize.TEXT,
      },
      gambar: {
        type: Sequelize.JSONB,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_studiPraformulasi",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
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
    await queryInterface.dropTable("t_kemasan");
  },
};
