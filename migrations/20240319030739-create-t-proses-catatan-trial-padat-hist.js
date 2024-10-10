"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_prosesCatatanTrialPadat_hist", {
      status: {
        type: Sequelize.STRING,
      },
      changeDate: {
        type: Sequelize.DATE,
      },
      id: {
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
      tableIndex: {
        type: Sequelize.INTEGER,
      },
      CatatanTrialID: {
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
    await queryInterface.dropTable("t_prosesCatatanTrialPadat_hist");
  },
};
