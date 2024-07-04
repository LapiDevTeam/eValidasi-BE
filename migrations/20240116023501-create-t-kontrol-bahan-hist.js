"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_kontrolBahan_hist", {
      id: {
        type: Sequelize.INTEGER,
      },
      namaBahan: {
        type: Sequelize.STRING,
      },
      parameter1: {
        type: Sequelize.STRING,
      },
      parameter2: {
        type: Sequelize.STRING,
      },
      parameter3: {
        type: Sequelize.STRING,
      },
      UjiInkompatibilitasID: {
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
    await queryInterface.dropTable("t_kontrolBahan_hist");
  },
};
