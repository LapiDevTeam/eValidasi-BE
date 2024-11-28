'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('t_hasilPengamatan', 'path', {
      type: Sequelize.STRING,
      allowNull: true, // Allow NULL values
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('t_hasilPengamatan', 'path', {
      type: Sequelize.STRING,
      allowNull: false, // Revert to NOT NULL if rolled back
    });
  },
};
