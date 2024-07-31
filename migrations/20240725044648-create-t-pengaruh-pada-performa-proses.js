"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_pengaruhPadaPerformaProses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      namaProduk: {
        type: Sequelize.STRING,
      },
      jumlahPenyimpangan: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_pengaruhPadaPerformaProses");
  },
};
