const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require('exceljs');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const MyError = require('../../helpers/errors');

async function getPPIItems(req, res) {
  try {
    const { itemType = 'BB' } = req.query;

    // Validate item type
    if (itemType !== 'BB' && itemType !== 'BK') {
      return res.status(400).json({
        message: 'Invalid item type. Must be either BB or BK'
      });
    }

    // Construct query based on VBA logic
    const sqlQuery = `
      SELECT
        ITEM_ID as kodeItem,
        RTRIM(ITEM_NAME) as namaItem,
        ITEM_UNIT as satuan
      FROM
        M_ITEM_MANUFACTURING
      WHERE
        ITEM_ISPPI = 1
        AND IsActive = 1
        AND ITEM_STATUS = 1
        AND item_type = :itemType
      ORDER BY
        item_id
    `;

    // Execute query
    const records = await sequelizeMSQL.query(sqlQuery, {
      replacements: { itemType },
      type: QueryTypes.SELECT
    });

    if (records.length === 0) {
      return res.status(404).json({ message: 'No items found' });
    }

    // Prepare response
    const responseData = {
      metadata: {
        title: 'Daftar Bahan Awal PPI',
        columns: ['Kode', 'Bahan Awal', 'Satuan'],
        type: itemType === 'BB' ? 'Bahan Baku' : 'Bahan Kemas',
        generatedOn: new Date().toISOString()
      },
      data: records
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting PPI items:', error);
    return res.status(500).json({
      message: 'Error getting PPI items',
      error: error.message
    });
  }
}

async function getFormulaByItem(req, res) {
  try {
    const { itemId } = req.query;

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    // SQL query based on QueryFormulaperItem VBA function
    const sqlQuery = `
      SELECT
        ppi_productid as productId,
        ppi_productinit as productInit,
        product_name as productName,
        ppi_id as ppiId,
        ppi_Subid as ppiSubId,
        SUM(CONVERT(FLOAT, PPI_Qty)) as quantity,
        ppi_unitid as unitId,
        item_name as itemName,
        item_id as itemId
      FROM
        m_ppi_detail
      LEFT JOIN
        m_product ON ppi_productid = product_id AND ppi_productinit = product_init
      LEFT JOIN
        m_item_manufacturing ON ppi_itemid = item_id
      WHERE
        ppi_id + ppi_subid + ppi_productid + CONVERT(NVARCHAR(1), ppi_productinit)
        IN (
          SELECT
            ppi_id + ppi_subid + ppi_productid + CONVERT(NVARCHAR(1), ppi_productinit)
          FROM
            m_ppi_header
          WHERE
            ppi_status = 'A' AND isActive = 1
        )
        AND ppi_itemid = :itemId
      GROUP BY
        ppi_productid, ppi_productinit, product_name, ppi_id, ppi_subid, ppi_unitid, item_name, item_id
      ORDER BY
        product_name, ppi_id, ppi_subid
    `;

    const formulaRecords = await sequelizeMSQL.query(sqlQuery, {
      replacements: { itemId },
      type: QueryTypes.SELECT
    });

    if (formulaRecords.length === 0) {
      return res.status(404).json({ message: 'No formula found for this item' });
    }

    // Get item details
    const itemQuery = `
      SELECT
        ITEM_ID as kodeItem,
        RTRIM(ITEM_NAME) as namaItem,
        ITEM_UNIT as satuan
      FROM
        M_ITEM_MANUFACTURING
      WHERE
        ITEM_ID = :itemId
    `;

    const itemRecords = await sequelizeMSQL.query(itemQuery, {
      replacements: { itemId },
      type: QueryTypes.SELECT
    });

    if (itemRecords.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Format the records for response
    const formattedFormulas = formulaRecords.map(record => ({
      productId: record.productId,
      productInit: record.productInit,
      productName: record.productName,
      ppiId: record.ppiId,
      ppiSubId: record.ppiSubId,
      quantity: parseFloat(record.quantity),
      unitId: record.unitId,
      itemName: record.itemName,
      itemId: record.itemId
    }));

    // Prepare response
    const responseData = {
      metadata: {
        title: 'Formula PPI Details',
        itemDetails: itemRecords[0],
        generatedOn: moment().format('DD-MMM-YYYY HH:mm:ss')
      },
      data: formattedFormulas
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting formula for item:', error);
    return res.status(500).json({
      message: 'Error getting formula for item',
      error: error.message
    });
  }
}

module.exports = {
  getFormulaByItem,
  getPPIItems
};