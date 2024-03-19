"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ProsesCatatanTrialPadat", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      speed: {
        type: Sequelize.STRING,
      },
      mainPressure: {
        type: Sequelize.STRING,
      },
      prePressure: {
        type: Sequelize.STRING,
      },
      settingBobot: {
        type: Sequelize.STRING,
      },
      kekerasan: {
        type: Sequelize.STRING,
      },
      tebal: {
        type: Sequelize.STRING,
      },
      abrasi: {
        type: Sequelize.STRING,
      },
      wh: {
        type: Sequelize.STRING,
      },
      keterangan: {
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
    await queryInterface.dropTable("ProsesCatatanTrialPadat");
  },
};
