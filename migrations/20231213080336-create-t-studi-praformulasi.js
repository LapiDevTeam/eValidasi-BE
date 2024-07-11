"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_studiPraformulasi", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nomor: {
        type: Sequelize.STRING,
      },
      tanggalPenyusunan: {
        type: Sequelize.DATE,
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
        type: Sequelize.JSONB,
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
      ProductBriefId: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_productBrief",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      kesimpulan: {
        type: Sequelize.STRING,
      },
      statusDokumen: {
        type: Sequelize.STRING,
        defaultValue: "Draft",
      },
      rdSelection: {
        type: Sequelize.STRING,
      },
      tujuanScreening: {
        type: Sequelize.TEXT,
      },
      kesimpulanScreening: {
        type: Sequelize.TEXT,
      },
      revisi: {
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
      is_approve_1: {
        type: Sequelize.STRING,
      },
      approver_name_1: {
        type: Sequelize.STRING,
      },
      approver_user_id_1: {
        type: Sequelize.STRING,
      },
      approver_delegated_to_1: {
        type: Sequelize.STRING,
      },
      approver_tanggal_1: {
        type: Sequelize.DATE,
      },
      keterangan_reject_1: {
        type: Sequelize.STRING,
      },
      is_approve_2: {
        type: Sequelize.STRING,
      },
      approver_name_2: {
        type: Sequelize.STRING,
      },
      approver_user_id_2: {
        type: Sequelize.STRING,
      },
      approver_delegated_to_2: {
        type: Sequelize.STRING,
      },
      approver_tanggal_2: {
        type: Sequelize.DATE,
      },
      keterangan_reject_2: {
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
    await queryInterface.dropTable("t_studiPraformulasi");
  },
};
