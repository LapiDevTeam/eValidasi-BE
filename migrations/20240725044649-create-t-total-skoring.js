"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_totalSkoring", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      persentaseDalamFormula: {
        type: Sequelize.FLOAT,
      },
      pengaruhPadaPerformaProses: {
        type: Sequelize.FLOAT,
      },
      jumlahBetsPerTahun: {
        type: Sequelize.FLOAT,
      },
      jumlahTotal: {
        type: Sequelize.FLOAT,
      },
      keterangan: {
        type: Sequelize.TEXT,
      },
      ProposalDiversifikasiID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_proposalDiversifikasi",
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
    await queryInterface.dropTable("t_totalSkoring");
  },
};
