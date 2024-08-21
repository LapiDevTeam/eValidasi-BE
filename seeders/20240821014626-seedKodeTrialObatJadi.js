"use strict";
const fs = require("fs");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Read and parse data for m_kodeTrialObatJadi_template
    const kodeTrialsTemplate = JSON.parse(
      fs.readFileSync("./data/kodeTrialObatJadi.json", "utf-8")
    );

    kodeTrialsTemplate.forEach((el) => {
      delete el.id;
      el.createdAt = new Date();
      el.updatedAt = new Date();
      el.komposisi = JSON.stringify(el?.komposisi);
    });

    // Insert data into m_kodeTrialObatJadi_template
    await queryInterface.bulkInsert(
      "m_kodeTrialObatJadi_template",
      kodeTrialsTemplate,
      {}
    );

    // Read and parse data for m_kodeTrialObatJadi
    const kodeTrials = JSON.parse(
      fs.readFileSync("./data/kodeTrialObatJadi.json", "utf-8")
    );

    kodeTrials.forEach((el) => {
      delete el.id;
      el.createdAt = new Date();
      el.updatedAt = new Date();
      el.komposisi = JSON.stringify(el?.komposisi);
    });

    // Insert data into m_kodeTrialObatJadi
    return queryInterface.bulkInsert("m_kodeTrialObatJadi", kodeTrials, {});
  },

  async down(queryInterface, Sequelize) {
    // Delete data from both tables
    await queryInterface.bulkDelete("m_kodeTrialObatJadi", null, {});
    return queryInterface.bulkDelete("m_kodeTrialObatJadi_template", null, {});
  },
};
