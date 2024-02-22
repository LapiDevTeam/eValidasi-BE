"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("OriginatorAtauKompetitor", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      originator: {
        type: Sequelize.STRING,
      },
      source: {
        type: Sequelize.STRING,
      },
      harga: {
        type: Sequelize.STRING,
      },
      pemeriksaanFisikDanKimiaOriginator: {
        type: Sequelize.STRING,
      },
      profilDisolusi: {
        type: Sequelize.STRING,
      },
      stabilita: {
        type: Sequelize.STRING,
      },
      totalKebutuhanMaterial: {
        type: Sequelize.STRING,
      },
      perkiraanHargaPembelianMaterial: {
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
    await queryInterface.dropTable("OriginatorAtauKompetitor");
  },
};
