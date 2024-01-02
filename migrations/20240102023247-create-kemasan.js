"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Kemasan", {
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
      bentukSediaan: {
        type: Sequelize.STRING,
      },
      detailSediaan: {
        type: Sequelize.JSONB,
      },
      StudiPraformulasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "StudiPraformulasi",
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
    await queryInterface.dropTable("Kemasan");
  },
};
