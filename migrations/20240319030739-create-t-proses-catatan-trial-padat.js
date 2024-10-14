"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_prosesCatatanTrialPadat", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kodeTrial: {
        type: Sequelize.STRING,
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
      jam: {
        type: Sequelize.STRING,
      },
      gelatinTank: {
        type: Sequelize.STRING,
      },
      gelatinBox: {
        type: Sequelize.STRING,
      },
      hopper: {
        type: Sequelize.STRING,
      },
      needle: {
        type: Sequelize.STRING,
      },
      pumpHeating: {
        type: Sequelize.STRING,
      },
      setDensity: {
        type: Sequelize.STRING,
      },
      jogSpeed: {
        type: Sequelize.STRING,
      },
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      CatatanTrialID: {
        type: Sequelize.INTEGER,
        references: {
          model: "t_catatanTrial",
          key: "id",
        },
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
    await queryInterface.dropTable("t_prosesCatatanTrialPadat");
  },
};
