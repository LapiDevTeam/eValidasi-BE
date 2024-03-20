"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PengamatanAwalCair", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      syaratPemerian: {
        type: Sequelize.STRING,
      },
      syaratPh: {
        type: Sequelize.STRING,
      },
      syaratBj: {
        type: Sequelize.STRING,
      },
      syaratViskositas: {
        type: Sequelize.STRING,
      },
      hasilPengujianPemerian: {
        type: Sequelize.STRING,
      },
      hasilPengujianPh: {
        type: Sequelize.STRING,
      },
      hasilPengujianBj: {
        type: Sequelize.STRING,
      },
      hasilPengujianViskositas: {
        type: Sequelize.STRING,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
        references: {
          model: "CatatanTrial",
          key: "id",
        },
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
    await queryInterface.dropTable("PengamatanAwalCair");
  },
};
