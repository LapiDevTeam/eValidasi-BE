"use strict";
const fs = require("fs");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */

    const bentukSediaans = JSON.parse(
      fs.readFileSync("./data/bentukSediaan.json", "utf-8")
    );
    bentukSediaans.forEach((el) => {
      delete el.id;
      el.createdAt = new Date();
      el.updatedAt = new Date();
    });
    return queryInterface.bulkInsert("m_bentuk_sediaan", bentukSediaans, {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete("m_bentuk_sediaan", null, {});
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
