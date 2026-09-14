'use strict';

/**
 * Konfigurasi cetak terkontrol lewat printForm.
 *
 * Tiga alamat berbeda dipakai di alur ini, dan membedakannya penting:
 *
 *   selfBaseUrl   Dipakai backend untuk memanggil dirinya sendiri saat merender
 *                 PDF. Selalu loopback — tidak pernah keluar mesin.
 *
 *   feBaseUrl     Alamat halaman pratinjau yang dibuka Puppeteer. Halaman itu
 *                 dirender di server, jadi alamat ini harus terjangkau server.
 *
 *   publicBaseUrl Alamat yang ditaruh di payload job untuk diambil printForm.
 *                 Ini satu-satunya yang harus terjangkau dari PC user, dan
 *                 host-nya wajib ada di allowedPdfHosts pada config printForm.
 */

const path = require('path');

module.exports = {
  selfBaseUrl:
    process.env.PRINTFORM_SELF_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3200}`,

  feBaseUrl:
    process.env.PRINTFORM_FE_BASE_URL || 'http://192.168.1.38/eValidasi-dev',

  publicBaseUrl:
    process.env.PRINTFORM_PUBLIC_BASE_URL || 'http://192.168.1.38/api/eValidasi-BE',

  /** PDF sementara. Dihapus begitu job ditutup. */
  tmpDir: path.join(__dirname, '..', 'tmp', 'print-jobs'),

  /**
   * Daftar putih route pratinjau.
   *
   * Frontend yang memilih route-nya (logikanya ada di sana, bergantung prefix
   * nomor sertifikat dan workbook), tapi nilainya tidak boleh dipercaya mentah:
   * tanpa daftar ini, klien bisa menyuruh Puppeteer membuka alamat apa pun di
   * jaringan internal dan mengembalikan isinya sebagai PDF.
   */
  allowedPrintRoutes: Object.freeze([
    '/PrintBagian',
    '/PrintMassa',
    '/PrintThermo',
    '/PrintEnclosures',
    '/PrintDissolutionTester',
    '/PrintFriabilityTester',
    '/PrintMoisture',
    '/PrintTemperatureControl',
    '/PrintTorqueMeter',
    '/PrintHardnessTester',
    '/PrintLeakTest',
  ]),

  /** Nomor dokumen form SERTIFIKAT KALIBRASI, sama dengan yang dipakai FE. */
  certificateDoc: Object.freeze({
    noDoc: 'PK.VN.000046.00.T08',
    tanggal: '15/01/2021',
    revisi: '00',
  }),
};
