const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const MyError = require('../../helpers/errors');

async function generateDPBA(req, res) {
  try {
    const { itemGroup } = req.query;

    if (!itemGroup) {
      return res.status(400).json({ message: 'Item group is required' });
    }

    // Query based on item group
    let queryStr = '';
    if (itemGroup === 'ä' || itemGroup === 'RH') {
      queryStr = `SELECT * FROM v_DPBA WHERE Item_group IN ('ä', 'RH')`;
    } else {
      queryStr = `SELECT * FROM v_DPBA WHERE Item_group = :itemGroup`;
    }

    const records = await sequelizeMSQL.query(queryStr, {
      replacements: { itemGroup },
      type: QueryTypes.SELECT
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found for the specified item group' });
    }

    // Determine document title and template file based on item group
    let docTitle = '';
    let templateFile = '';
    let headers = [];

    // Define report configurations based on item group
    switch(itemGroup) {
      case 'C':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL CONTAINER';
        templateFile = 'DA.RD.000010';
        headers = ['KODE', 'NAMA', 'PEMBUAT/PEMASOK', 'KETERANGAN', 'STATUS HALAL'];
        break;
      case 'A':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL ALUMINIUM FOIL';
        templateFile = 'DA.RD.000011';
        headers = ['KODE', 'NAMA', 'UKURAN', 'ROW', 'PEMBUAT/PEMASOK'];
        break;
      case 'AB':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL ALUMINIUM BLIND';
        templateFile = 'DA.RD.000012';
        headers = ['KODE', 'NAMA', 'UKURAN', 'PEMBUAT/PEMASOK', 'KETERANGAN'];
        break;
      case 'BA':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL BAHAN BANTU ALUMINIUM';
        templateFile = 'DA.RD.000013';
        headers = ['KODE', 'NAMA', 'UKURAN', 'PEMBUAT/PEMASOK'];
        break;
      case 'BB':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL BAHAN BANTU BLISTER';
        templateFile = 'DA.RD.000014';
        headers = ['KODE', 'NAMA', 'UKURAN', 'PEMBUAT', 'PEMASOK', 'KETERANGAN'];
        break;
      case 'B':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL BLISTER';
        templateFile = 'DA.RD.000015';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'PEMASOK', 'KETERANGAN'];
        break;
      case 'BR':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL BROSUR';
        templateFile = 'DA.RD.000016';
        headers = ['KODE', 'NAMA', 'PEMBUAT/PEMASOK'];
        break;
      case 'L':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL LABEL';
        templateFile = 'DA.RD.000017';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'PEMASOK'];
        break;
      case 'E':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL ETIKET';
        templateFile = 'DA.RD.000018';
        headers = ['KODE', 'NAMA', 'PEMBUAT/PEMASOK', 'KETERANGAN'];
        break;
      case 'D':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL DUS';
        templateFile = 'DA.RD.000019';
        headers = ['KODE', 'NAMA', 'PEMBUAT/PEMASOK'];
        break;
      case 'K':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL KARTON';
        templateFile = 'DA.RD.000020';
        headers = ['KODE', 'UKURAN', 'PEMBUAT/PEMASOK', 'KETERANGAN'];
        break;
      case 'IN':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL INTISARI';
        templateFile = 'DA.RD.000005';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'NEGARA ASAL', 'PEMASOK', 'STATUS HALAL'];
        break;
      case 'PR':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL PARFUM';
        templateFile = 'DA.RD.000008';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'NEGARA ASAL', 'PEMASOK', 'STATUS HALAL'];
        break;
      case 'CO':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL COLORING AGENT';
        templateFile = 'DA.RD.000007';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'NEGARA ASAL', 'PEMASOK', 'STATUS HALAL'];
        break;
      case 'FL':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL FLAVORING AGENT';
        templateFile = 'DA.RD.000006';
        headers = ['KODE', 'NAMA', 'PEMBUAT', 'NEGARA ASAL', 'PEMASOK', 'STATUS HALAL'];
        break;
      case 'AC':
        docTitle = 'DAFTAR PEMASOK BAHAN AWAL ACTIVE INGREDIENT';
        templateFile = 'DA.RD.000004';
        headers = ['KODE', 'NAMA', 'NAMA BAHAN AWAL GENERIK', 'PEMBUAT', 'NEGARA ASAL', 'PEMASOK', 'STATUS HALAL'];
        break;
      default:
        docTitle = 'DAFTAR PEMASOK PRODUK ANTARA';
        templateFile = 'DA.RD.000009';
        headers = ['KODE', 'NAMA', 'PEMBUAT'];
    }

    // Process records for display
    const processedData = records.map(record => {
      // Format common fields
      const makerSupplier = (record.PEMBUAT && record.PEMASOK &&
                            record.PEMBUAT.toUpperCase() === record.PEMASOK.toUpperCase())
        ? record.PEMBUAT
        : `${record.PEMBUAT || ''}; ${record.PEMASOK || ''}`;

      // Format halal status
      let halalStr = '-';
      if (record.item_ishalal && record.keterangan_halal && record.keterangan_halal.trim().length > 1) {
        halalStr = `Halal${record.keterangan_halal}`;
      }

      // Create row object based on item group
      let rowData = {};

      switch(itemGroup) {
        case 'C':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || '',
            statusHalal: halalStr
          };
          break;
        case 'A':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            row: record.Roww || '',
            pembuatPemasok: makerSupplier
          };
          break;
        case 'AB':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || ''
          };
          break;
        case 'BA':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier
          };
          break;
        case 'BB':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || '',
            keterangan: record.KETERANGAN || ''
          };
          break;
        case 'B':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || '',
            keterangan: record.KETERANGAN || ''
          };
          break;
        case 'BR':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier
          };
          break;
        case 'L':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || ''
          };
          break;
        case 'E':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || ''
          };
          break;
        case 'D':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier
          };
          break;
        case 'K':
          rowData = {
            kode: record.KODE || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || ''
          };
          break;
        case 'IN':
        case 'PR':
        case 'CO':
        case 'FL':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
            negaraAsal: record.NEGARAASAL || '',
            pemasok: record.PEMASOK || '',
            statusHalal: halalStr
          };
          break;
        case 'AC':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            namaBahanAwalGenerik: record.NAMAGENERIK || '',
            pembuat: record.PEMBUAT || '',
            negaraAsal: record.NEGARAASAL || '',
            pemasok: record.PEMASOK || '',
            statusHalal: halalStr
          };
          break;
        default:
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || ''
          };
      }

      return rowData;
    });

    // Prepare response data
    const responseData = {
      metadata: {
        title: docTitle,
        templateRef: templateFile,
        headers: headers,
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
      },
      data: processedData
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error generating DPBA data:', error);
    return res.status(500).json({
      message: 'Error generating DPBA data',
      error: error.message
    });
  }
}

module.exports = {
  generateDPBA
};