"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StudiPraformulasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tanggalAddendum: {
        type: Sequelize.DATE,
      },
      addendumKe: {
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      komposisi: {
        type: Sequelize.STRING,
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
      studiOriginatorId: {
        type: Sequelize.INTEGER,
      },
      studiLiterature: {
        type: Sequelize.JSONB,
      },
      studiPaten: {
        type: Sequelize.JSONB,
      },
      ujiKompatibilitas: {
        type: Sequelize.JSONB,
      },
      kesimpulan: {
        type: Sequelize.STRING,
      },
      ProductBriefId: {
        type: Sequelize.INTEGER,
        references: {
          model: "ProductBrief",
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
    await queryInterface.dropTable("StudiPraformulasi");
  },
};
