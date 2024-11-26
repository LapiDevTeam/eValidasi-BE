"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_jumlahBetsPerTahun_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      jumlahBets: {
        type: Sequelize.INTEGER,
      },
      skorA: {
        type: Sequelize.INTEGER,
      },
      bobotB: {
        type: Sequelize.INTEGER,
      },
      jumlah: {
        type: Sequelize.FLOAT,
      },
      ProposalDiversifikasiID: {
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
        type: Sequelize.DATE,
      },
      updatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_jumlahBetsPerTahun_hist");
  },
};
