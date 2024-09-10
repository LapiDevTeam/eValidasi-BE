"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "t_formulaFix_rancanganSpesifikasiObatJadi",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        parameter: {
          type: Sequelize.TEXT,
        },
        spesifikasi: {
          type: Sequelize.TEXT,
        },
        referensi: {
          type: Sequelize.TEXT,
        },
        justifikasi: {
          type: Sequelize.TEXT,
        },
        FormulaFixID: {
          type: Sequelize.INTEGER,
          references: {
            model: "t_formulaFix",
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
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("t_formulaFix_rancanganSpesifikasiObatJadi");
  },
};
