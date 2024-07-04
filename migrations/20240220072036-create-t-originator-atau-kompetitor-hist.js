"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_originatorAtauKompetitor_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
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
      StudiPraformulasiID: {
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
    await queryInterface.dropTable("t_originatorAtauKompetitor_hist");
  },
};
