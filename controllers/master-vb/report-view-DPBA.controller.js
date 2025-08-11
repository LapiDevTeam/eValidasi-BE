const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require('exceljs');
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
      type: QueryTypes.SELECT,
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found for the specified item group' });
    }

    // Determine document title and template file based on item group
    let docTitle = '';
    let templateFile = '';
    let headers = [];

    // Define report configurations based on item group
    switch (itemGroup) {
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
    const processedData = records.map((record) => {
      // Format common fields
      const makerSupplier =
        record.PEMBUAT && record.PEMASOK && record.PEMBUAT.toUpperCase() === record.PEMASOK.toUpperCase()
          ? record.PEMBUAT
          : `${record.PEMBUAT || ''}; ${record.PEMASOK || ''}`;

      // Format halal status
      let halalStr = '-';
      if (record.item_ishalal && record.keterangan_halal && record.keterangan_halal.trim().length > 1) {
        halalStr = `Halal${record.keterangan_halal}`;
      }

      // Create row object based on item group
      let rowData = {};

      switch (itemGroup) {
        case 'C':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || '',
            statusHalal: halalStr,
          };
          break;
        case 'A':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            row: record.Roww || '',
            pembuatPemasok: makerSupplier,
          };
          break;
        case 'AB':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || '',
          };
          break;
        case 'BA':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier,
          };
          break;
        case 'BB':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            ukuran: record.UKURAN || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || '',
            keterangan: record.KETERANGAN || '',
          };
          break;
        case 'B':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || '',
            keterangan: record.KETERANGAN || '',
          };
          break;
        case 'BR':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
          };
          break;
        case 'L':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
            pemasok: record.PEMASOK || '',
          };
          break;
        case 'E':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || '',
          };
          break;
        case 'D':
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuatPemasok: makerSupplier,
          };
          break;
        case 'K':
          rowData = {
            kode: record.KODE || '',
            ukuran: record.UKURAN || '',
            pembuatPemasok: makerSupplier,
            keterangan: record.KETERANGAN || '',
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
            statusHalal: halalStr,
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
            statusHalal: halalStr,
          };
          break;
        default:
          rowData = {
            kode: record.KODE || '',
            nama: record.NAMA || '',
            pembuat: record.PEMBUAT || '',
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
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss'),
      },
      data: processedData,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error generating DPBA data:', error);
    return res.status(500).json({
      message: 'Error generating DPBA data',
      error: error.message,
    });
  }
}

async function exportItemUsageReport(req, res, next) {
  try {
    const { user_id, bagian_user } = req.user;
    const { itemID } = req.query;

    // Check user authentication
    if (!user_id || user_id === '') {
      throw new MyError(401, 'Unauthorized request!');
    }

    // Check if itemID is provided (equivalent to txtItemID.Text = "" check)
    if (!itemID || itemID.trim() === '') {
      throw new MyError(400, 'Pilih bahan terlebih dahulu');
    }

    // Check user department access (similar to VB logic - only RD departments)
    if (!bagian_user || !bagian_user.startsWith('RD')) {
      throw new MyError(403, 'Access denied. Only RD departments can export this report.');
    }

    // SQL query from VB code - exact match to the original
    let strTemp = `select d.pengelompokan, b.Product_Name, a.PPI_ProductID, e.PPI_ItemID, f.item_name, sum(convert(float,e.PPI_QTY)) as totalPPI, e.PPI_UnitID, a.PPI_BatchSize, a.PPI_BatchSizeUnitID`;
    strTemp += ` From m_ppi_header a`;
    strTemp += ` left join m_product b on a.PPI_ProductID = b.product_id`;
    strTemp += ` left join m_product_pc_group_detail c on a.PPI_ProductID = c.Product_id`;
    strTemp += ` left join m_product_pc_group_header d on d.ID_master = c.ID_master`;
    strTemp += ` left join m_ppi_detail e on a.PPI_ProductID = e.PPI_ProductID and a.PPI_ID = e.PPI_ID and a.PPI_SubID = e.PPI_SubID`;
    strTemp += ` left join m_item_manufacturing f on e.PPI_ItemID = f.item_id`;
    strTemp += ` where a.PPI_ProductID in`;
    strTemp += ` (select distinct ppi_productid From m_ppi_detail where PPI_ItemID in (:itemID)`;
    strTemp += ` and PPI_ProductID+PPI_SubID+PPI_ID in (select PPI_ProductID+PPI_SubID+PPI_ID from m_ppi_header where isActive = 1))`;
    strTemp += ` and e.PPI_ItemID in (:itemID)`;
    strTemp += ` and b.isActive = 1`;
    strTemp += ` and a.status_default = 1`;
    strTemp += ` group by d.pengelompokan, b.Product_Name, a.PPI_ProductID, e.PPI_ItemID, f.item_name, e.PPI_UnitID, a.PPI_BatchSize, a.PPI_BatchSizeUnitID`;
    strTemp += ` order by d.pengelompokan, b.product_name`;

    // Execute query
    const data = await sequelizeMSQL.query(strTemp, {
      type: QueryTypes.SELECT,
      replacements: {
        itemID: itemID
      }
    });

    if (!data || data.length === 0) {
      throw new MyError(404, 'No data found for the specified Item ID');
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eFormulation System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Item Usage Report');

    // Define headers based on the query columns
    const headers = [
      'Pengelompokan',
      'Product Name',
      'Product ID',
      'Item ID',
      'Item Name',
      'Total PPI',
      'Unit ID',
      'Batch Size',
      'Batch Size Unit ID'
    ];

    // Add headers to worksheet
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add borders to headers
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add data rows
    data.forEach((row, index) => {
      const dataRow = worksheet.addRow([
        row.pengelompokan || '',
        row.Product_Name || '',
        row.PPI_ProductID || '',
        row.PPI_ItemID || '',
        row.item_name || '',
        row.totalPPI || 0,
        row.PPI_UnitID || '',
        row.PPI_BatchSize || '',
        row.PPI_BatchSizeUnitID || ''
      ]);

      // Add borders to data rows
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Format numeric column (Total PPI)
      const totalPPICell = dataRow.getCell(6);
      totalPPICell.numFmt = '#,##0.00';
      totalPPICell.alignment = { horizontal: 'right' };
    });

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = headers[index].length;

      data.forEach(row => {
        const values = Object.values(row);
        if (values[index]) {
          const cellLength = values[index].toString().length;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        }
      });

      column.width = maxLength < 10 ? 10 : Math.min(maxLength + 2, 50);
    });

    // Generate filename with timestamp
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const filename = `Item_Usage_Report_${itemID}_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Generate Excel buffer and send
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);

  } catch (error) {
    console.error('Item Usage Excel export error:', error);
    next(error);
  }
}

async function exportPrinciples(req, res) {
  try {
    // SQL query to get principles data (same as in VBA)
    const sqlQuery = `
      select distinct B.Item_PrcID, C.Prc_Name
      from m_item_manufacturing a
      left join m_item_manufacturing_supplier b on isnull(a.Item_ID,'') = isnull(b.Item_ID,'') and b.isActive = 1
      left join m_principle c on isnull(c.prc_ID,'') = isnull(b.Item_PrcID,'') and c.isActive = 1
      left join m_supplier D on D.Supp_ID = B.Item_SuppID
      where a.isActive = 1 and b.isActive = 1
      order by 1 asc
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      type: QueryTypes.SELECT,
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eFormulation System';
    workbook.created = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('LineA1');

    // Set column widths
    worksheet.getColumn('A').width = 15;
    worksheet.getColumn('B').width = 60;

    // Add title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Export data DPBA Principle';
    titleCell.font = { bold: true, size: 13 };

    // Add headers
    const headerRowA = worksheet.getCell('A3');
    headerRowA.value = 'Kode Principle';
    headerRowA.font = { bold: true, size: 13 };
    headerRowA.alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRowB = worksheet.getCell('B3');
    headerRowB.value = 'Nama Principle';
    headerRowB.font = { bold: true, size: 13 };
    headerRowB.alignment = { horizontal: 'center', vertical: 'middle' };

    // Set row height
    worksheet.getRow(3).height = 25;

    // Add borders to headers
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add data rows
    records.forEach((record, index) => {
      const rowIndex = index + 4;

      // Add data
      worksheet.getCell(`A${rowIndex}`).value = `${record.Item_PrcID}`;
      worksheet.getCell(`B${rowIndex}`).value = record.Prc_Name || '';

      // Add borders
      const dataRow = worksheet.getRow(rowIndex);
      dataRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DPBA_Principles_${moment().format('YYYYMMDD')}.xlsx`);

    // Send the Excel buffer
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting principles:', error);
    return res.status(500).json({
      message: 'Error exporting principles',
      error: error.message,
    });
  }
}

async function getPrinciples(req, res) {
  try {
    // SQL query to get principles data (same as in VBA)
    const sqlQuery = `
      select distinct B.Item_PrcID, C.Prc_Name
      from m_item_manufacturing a
      left join m_item_manufacturing_supplier b on isnull(a.Item_ID,'') = isnull(b.Item_ID,'') and b.isActive = 1
      left join m_principle c on isnull(c.prc_ID,'') = isnull(b.Item_PrcID,'') and c.isActive = 1
      left join m_supplier D on D.Supp_ID = B.Item_SuppID
      where a.isActive = 1 and b.isActive = 1
      order by 1 asc
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      type: QueryTypes.SELECT,
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Format data for response
    const formattedData = records.map((record) => ({
      kodePrinciple: record.Item_PrcID,
      namaPrinciple: record.Prc_Name || '',
    }));

    // Prepare response
    const responseData = {
      metadata: {
        title: 'DAFTAR PEMASOK PRINCIPLES',
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss'),
      },
      data: formattedData,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error getting principles:', error);
    return res.status(500).json({
      message: 'Error getting principles',
      error: error.message,
    });
  }
}

async function exportSuppliers(req, res) {
  try {
    // SQL query to get supplier data (same as in VBA)
    const sqlQuery = `
      select distinct B.Item_SuppID, D.Supp_Name
      from m_item_manufacturing a
      left join m_item_manufacturing_supplier b on isnull(a.Item_ID,'') = isnull(b.Item_ID,'') and b.isActive = 1
      left join m_principle c on isnull(c.prc_ID,'') = isnull(b.Item_PrcID,'') and c.isActive = 1
      left join m_supplier D on D.Supp_ID = B.Item_SuppID
      where a.isActive = 1 and b.isActive = 1
      order by 1 asc
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      type: QueryTypes.SELECT,
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'eFormulation System';
    workbook.created = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('LineA1');

    // Set column widths
    worksheet.getColumn('A').width = 15;
    worksheet.getColumn('B').width = 85;

    // Add title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Export data DPBA Supplier';
    titleCell.font = { bold: true, size: 13 };

    // Add headers
    const headerRowA = worksheet.getCell('A3');
    headerRowA.value = 'Kode Supplier';
    headerRowA.font = { bold: true, size: 13 };
    headerRowA.alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRowB = worksheet.getCell('B3');
    headerRowB.value = 'Nama Supplier';
    headerRowB.font = { bold: true, size: 13 };
    headerRowB.alignment = { horizontal: 'center', vertical: 'middle' };

    // Set row height
    worksheet.getRow(3).height = 25;

    // Add borders to headers
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add data rows
    records.forEach((record, index) => {
      const rowIndex = index + 4;

      // Add data (note: adding single quote prefix to match VBA code)
      worksheet.getCell(`A${rowIndex}`).value = `${record.Item_SuppID}`;
      worksheet.getCell(`B${rowIndex}`).value = record.Supp_Name || '';

      // Add borders
      const dataRow = worksheet.getRow(rowIndex);
      dataRow.eachCell({ includeEmpty: true }, function (cell, colNumber) {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DPBA_Suppliers_${moment().format('YYYYMMDD')}.xlsx`);

    // Send the Excel buffer
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting suppliers:', error);
    return res.status(500).json({
      message: 'Error exporting suppliers',
      error: error.message,
    });
  }
}

async function getSuppliers(req, res) {
  try {
    // SQL query to get supplier data (same as in VBA)
    const sqlQuery = `
      select distinct B.Item_SuppID, D.Supp_Name
      from m_item_manufacturing a
      left join m_item_manufacturing_supplier b on isnull(a.Item_ID,'') = isnull(b.Item_ID,'') and b.isActive = 1
      left join m_principle c on isnull(c.prc_ID,'') = isnull(b.Item_PrcID,'') and c.isActive = 1
      left join m_supplier D on D.Supp_ID = B.Item_SuppID
      where a.isActive = 1 and b.isActive = 1
      order by 1 asc
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      type: QueryTypes.SELECT,
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    // Format data for response
    const formattedData = records.map((record) => ({
      kodeSupplier: record.Item_SuppID,
      namaSupplier: record.Supp_Name || '',
    }));

    // Prepare response
    const responseData = {
      metadata: {
        title: 'DAFTAR PEMASOK SUPPLIERS',
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss'),
      },
      data: formattedData,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return res.status(500).json({
      message: 'Error getting suppliers',
      error: error.message,
    });
  }
}

module.exports = {
  generateDPBA,
  exportPrinciples,
  getPrinciples,
  exportSuppliers,
  getSuppliers,
  exportItemUsageReport
};
