"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("t_pengamatanAwalPadat_hist", {
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
      spesifikasiPemerian: {
        type: Sequelize.STRING,
      },
      settingPemerian: {
        type: Sequelize.STRING,
      },
      evaluasiPemerian: {
        type: Sequelize.STRING,
      },
      bobotIsiCangkang: {
        type: Sequelize.STRING,
      },
      bobotIsiCangkangBending: {
        type: Sequelize.STRING,
      },
      spesifikasiKeseragamanBobot: {
        type: Sequelize.STRING,
      },
      spesifikasiKekerasanTablet: {
        type: Sequelize.STRING,
      },
      settingKekerasanTablet: {
        type: Sequelize.STRING,
      },
      evaluasiKekerasanTablet: {
        type: Sequelize.JSONB,
      },
      rataRataKekerasanTablet: {
        type: Sequelize.STRING,
      },
      spesifikasiWaktuHancur: {
        type: Sequelize.STRING,
      },
      settingWaktuHancur: {
        type: Sequelize.STRING,
      },
      evaluasiWaktuHancur: {
        type: Sequelize.STRING,
      },
      spesifikasiKerapuhan: {
        type: Sequelize.STRING,
      },
      settingKerapuhan: {
        type: Sequelize.STRING,
      },
      evaluasiKerapuhan: {
        type: Sequelize.STRING,
      },
      spesifikasiKetebalan: {
        type: Sequelize.STRING,
      },
      settingKetebalan: {
        type: Sequelize.STRING,
      },
      evaluasiKetebalan: {
        type: Sequelize.JSONB,
      },
      rataRataKetebalan: {
        type: Sequelize.STRING,
      },
      spesifikasiUkuran: {
        type: Sequelize.STRING,
      },
      settingUkuran: {
        type: Sequelize.STRING,
      },
      evaluasiUkuran: {
        type: Sequelize.STRING,
      },

      spesifikasiKeseragamanBobotKapsulKosong: {
        type: Sequelize.STRING,
      },
      spesifikasiKeseragamanBobotIsiKapsul: {
        type: Sequelize.STRING,
      },
      spesifikasiBobotIsiCangkang: {
        type: Sequelize.STRING,
      },
      spesifikasiBobotIsiCangkangBending: {
        type: Sequelize.STRING,
      },
      spesifikasiWaktuHancurKapsul: {
        type: Sequelize.STRING,
      },
      settingWaktuHancurKapsul: {
        type: Sequelize.STRING,
      },
      evaluasiWaktuHancurKapsul: {
        type: Sequelize.STRING,
      },

      spesifikasiPemerian: {
        type: Sequelize.STRING,
      },
      settingPemerian: {
        type: Sequelize.STRING,
      },
      evaluasiPemerian: {
        type: Sequelize.STRING,
      },

      spesifikasiCangkangKapsulNo: {
        type: Sequelize.STRING,
      },
      settingCangkangKapsulNo: {
        type: Sequelize.STRING,
      },
      evaluasiCangkangKapsulNo: {
        type: Sequelize.STRING,
      },
      spesifikasiCap: {
        type: Sequelize.STRING,
      },
      settingCap: {
        type: Sequelize.STRING,
      },
      evaluasiCap: {
        type: Sequelize.STRING,
      },
      spesifikasiBody: {
        type: Sequelize.STRING,
      },
      settingBody: {
        type: Sequelize.STRING,
      },
      evaluasiBody: {
        type: Sequelize.STRING,
      },
      spesifikasiPenandaanCap: {
        type: Sequelize.STRING,
      },
      settingPenandaanCap: {
        type: Sequelize.STRING,
      },
      evaluasiPenandaanCap: {
        type: Sequelize.STRING,
      },
      spesifikasiPenandaanBody: {
        type: Sequelize.STRING,
      },
      settingPenandaanBody: {
        type: Sequelize.STRING,
      },
      evaluasiPenandaanBody: {
        type: Sequelize.STRING,
      },

      syaratWarna: {
        type: Sequelize.STRING,
      },
      spesifikasiWarna: {
        type: Sequelize.STRING,
      },
      hasilWarna: {
        type: Sequelize.STRING,
      },
      syaratBauAroma: {
        type: Sequelize.STRING,
      },
      spesifikasiBauAroma: {
        type: Sequelize.STRING,
      },
      hasilBauAroma: {
        type: Sequelize.STRING,
      },
      syaratRasa: {
        type: Sequelize.STRING,
      },
      spesifikasiRasa: {
        type: Sequelize.STRING,
      },
      hasilRasa: {
        type: Sequelize.STRING,
      },
      syaratPh: {
        type: Sequelize.STRING,
      },
      spesifikasiPh: {
        type: Sequelize.STRING,
      },
      hasilPh: {
        type: Sequelize.STRING,
      },
      syaratBj: {
        type: Sequelize.STRING,
      },
      spesifikasiBj: {
        type: Sequelize.STRING,
      },
      hasilBj: {
        type: Sequelize.STRING,
      },
      syaratViskositas: {
        type: Sequelize.STRING,
      },
      spesifikasiViskositas: {
        type: Sequelize.STRING,
      },
      hasilViskositas: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("t_pengamatanAwalPadat_hist");
  },
};
