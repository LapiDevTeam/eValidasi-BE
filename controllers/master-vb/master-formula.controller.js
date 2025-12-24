const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const { Sequelize } = require('../../models');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');

const getPPIDescription = async (req, res) => {
  try {
    const result = await sequelizeMSQL.query('SELECT distinct PPI_Description FROM m_PPI_Type_Owner', {
      type: QueryTypes.SELECT,
    });

    if (result.length === 0) {
      return res.status(404).send({ message: 'No data found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };
    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getPPIFormat = async (req, res) => {
  const { PPI_Description, PPI_Owner } = req.query;

  if (!PPI_Description || !PPI_Owner) {
    return res.status(400).send({ message: 'PPI_Description and PPI_Owner are required' });
  }

  try {
    const result = await sequelizeMSQL.query(
      'SELECT PPI_Format FROM m_PPI_Type_Owner WHERE PPI_Description LIKE :PPI_Description AND PPI_Owner LIKE :PPI_Owner',
      {
        replacements: {
          PPI_Description: `%${PPI_Description}%`,
          PPI_Owner: `%${PPI_Owner}%`,
        },
        type: QueryTypes.SELECT,
      }
    );

    if (result.length === 0) {
      return res.status(404).send({ message: 'No data found' });
    }

    const PPI_Format = result[0].PPI_Format;
    let ItemType = 'BK';
    let ItemSubType = 'S';

    if (PPI_Description.toUpperCase().includes('PENGOLAHAN')) {
      ItemType = 'BB';
      ItemSubType = 'P';
    } else if (PPI_Description.toUpperCase().includes('PRIMER')) {
      ItemType = 'BK';
      ItemSubType = 'P';
    }

    const resp = {
      message: 'OK',
      data: {
        PPI_Format,
        ItemType,
        ItemSubType,
      },
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getOwner = async (req, res) => {
  try {
    const result = await sequelizeMSQL.query('SELECT distinct PPI_Owner FROM m_PPI_Type_Owner', {
      type: QueryTypes.SELECT,
    });

    if (result.length === 0) {
      return res.status(404).send({ message: 'No data found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };
    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    let s = req.query.search || '';

    let strSQL = `
      SELECT
        Product_ID,
        Product_Name,
        Product_Category,
        Category_Name,
        Product_Currency,
        Currency_Description,
        Product_HPP,
        Product_HNA,
        Product_HTollIN,
        Product_HTollINFee,
        Product_VolumeInBox,
        Product_VolumeInBigBox,
        Product_Unit,
        Unit_Description,
        Product_Type,
        Type_Name,
        Product_IntermediateID,
        Item_Name,
        Product_Init,
        CASE
          WHEN product_Owner LIKE 'TM' THEN 'RD3'
          ELSE product_Owner
        END AS product_Owner
      FROM vwProduct
      WHERE isActive = 1
    `;

    if (s !== '') {
      strSQL += ` AND (Product_ID LIKE '${s}%' OR Product_Name LIKE '%${s}%')`;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      type: QueryTypes.SELECT,
    });

    if (result.length === 0) {
      return res.status(404).send({ message: 'Data Not Found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getPPIItems = async (req, res) => {
  const { PPI_ProductID, PPI_ID, isTemplate = 0 } = req.query;

  if (!PPI_ProductID || !PPI_ID) {
    return res.status(400).send({ message: 'PPI_ProductID and PPI_ID are required' });
  }

  if (!PPI_ID.includes('/PP/')) {
    return res.status(400).send({ message: 'Invalid PPI_ID format' });
  }


  try {
    const strSQL = `
      SELECT DISTINCT
        A.PPI_ID,
        A.PPI_ProductID,
        C.Product_Name,
        A.PPI_ItemID,
        A.Item_Name,
        A.Prc_ID AS item_prcid,
        A.Prc_Name,
        ISNULL(B.Status_PPI, '') AS Status_PPI,
        ISNULL(B.Priority, '') AS Priority,
        D.PPI_Description
      FROM vw_PPI_Item_PRC_Status_Export_to_David AS A
      LEFT JOIN m_ppi_detail_not_produksi AS B
        ON A.PPI_ProductID = B.PPI_ProductID
        AND A.PPI_ItemID = B.PPI_ItemID
        AND A.Prc_ID = B.Item_prcID
      LEFT JOIN m_product AS C
        ON C.Product_ID = A.PPI_ProductID
      LEFT JOIN m_PPI_Type_Owner AS D
        ON D.PPI_Format = A.PPI_ID
      WHERE A.PPI_ProductID = :PPI_ProductID
      ORDER BY A.PPI_ProductID, A.PPI_ItemID, ISNULL(B.Status_PPI, ''), ISNULL(B.Priority, '')
    `;

    const strSQLTemplate = `
      SELECT DISTINCT
        '' AS PPI_ID,
        A.PPI_ProductID,
        A.PPI_ItemID,
        A.Item_Name,
        A.Prc_ID,
        A.Prc_Name,
        CASE
          WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
          ELSE ISNULL(B.Status_PPI, '')
        END AS Status_PPI,
        CASE
          WHEN ISNULL(B.Priority, '') = '' THEN ''
          ELSE ISNULL(B.Priority, '')
        END AS Priority,
        CAST(ISNULL(B.default_PC, 0) AS INT) AS default_PC
      FROM vw_PPI_Item_PRC_Status AS A
      LEFT JOIN m_ppi_detail_not_produksi_temp AS B
        ON A.PPI_ProductID = B.PPI_ProductID
        AND A.PPI_ItemID = B.PPI_ItemID
        AND A.Prc_ID = B.Item_prcID
      WHERE A.PPI_ProductID = :PPI_ProductID
      ORDER BY A.PPI_ItemID
    `;

    let result;
    console.log({asd: isTemplate == '0'});
    if (isTemplate == '0') {
      result = await sequelizeMSQL.query(strSQL, {
        replacements: { PPI_ProductID },
        type: QueryTypes.SELECT,
      });
    } else {
      result = await sequelizeMSQL.query(strSQLTemplate, {
        replacements: { PPI_ProductID },
        type: QueryTypes.SELECT,
      });
    }

    if (result.length === 0) {
      return res.status(404).send({ message: 'Data Not Found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getPPI = async (req, res) => {
  const { search, isTemplate = 0 } = req.query;

  try {
    let tableName = 'vwPPIHeaderWithProductOwner';
    if (isTemplate != '0') {
      tableName = 'vwPPIHeaderwithProductOwner_template';
    }

    let strSQL = `
      SELECT
        PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) as tag,
        PPI_ID,
        PPI_ProductID,
        PPI_ProductInit,
        Product_Name,
        PPI_SubID,
        CASE
          WHEN PPI_Status = 'A' THEN 'Active'
          ELSE 'Inactive'
        END AS Stat,
        PPI_BatchSize,
        PPI_BatchSizeUnitID,
        PPI_Kemasan,
        PPI_Status,
        PPI_Owner,
        PPI_Description,
        PPI_Status,
        CASE
          WHEN product_owner LIKE 'TM' THEN 'RD3'
          ELSE product_owner
        END AS product_owner,
        PPI_LOT,
        ${isTemplate == 1 ? 'spv_Approve_date, ' : ''}
        ${isTemplate == 1 ? 'spv_user_approve, ' : ''}
        ${isTemplate == 0 ? 'PPI_ED,' : ''}
        ppi_revisi,
        pPI_batchsizekemasan,
        ISNULL(rendemen_min, 0) AS rendemen_min,
        PPI_Kemasan01
      FROM ${tableName} WITH (NOLOCK)
      WHERE isActive = 1
    `;


    if (search) {
      strSQL += ` AND (PPI_ProductID LIKE '${search}%' OR Product_Name LIKE '${search}%')`;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      type: QueryTypes.SELECT,
    });

    if (result.length === 0) {
      return res.status(404).send({ message: 'Data Not Found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const exportPPI = async (req, res, next) => {
  const { PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_SubID } = req.query;

  try {
    let strSQL;

    if (PPI_ID && PPI_ProductID && PPI_ProductInit) {
      strSQL = `
        SELECT
          b.PPI_Owner,
          b.PPI_Description,
          a.PPI_ID,
          a.PPI_SubID,
          a.PPI_ProductID,
          b.Product_Name,
          b.PPI_BatchSize,
          b.PPI_BatchSizeUnitID,
          b.PPI_Kemasan,
          a.PPI_SeqID,
          a.PPI_ItemID,
          a.Group_Name,
          a.Item_Name,
          a.Item_Size,
          a.PPI_QTY,
          a.PPI_UnitID
        FROM vwPPIDetailWithItem a
        LEFT JOIN vwPPIHeaderWithProductOwner b
          ON a.PPI_ID = b.PPI_ID
          AND a.PPI_SubID = b.PPI_SubID
          AND a.PPI_ProductID = b.PPI_ProductID
          AND a.PPI_ProductInit = b.PPI_ProductInit
        WHERE b.isActive = 1
          AND b.PPI_Status = 'A'
          AND a.PPI_ID LIKE :PPI_ID
          ${PPI_SubID ? `AND a.PPI_SubID LIKE :PPI_SubID` : ''}
          AND a.PPI_ProductID LIKE :PPI_ProductID
          AND a.PPI_ProductInit = :PPI_ProductInit
        ORDER BY a.PPI_ProductID, a.PPI_SubID, a.PPI_ID, a.PPI_SeqID
      `;
    } else {
      strSQL = "SELECT * FROM vwPPI_PRINT";
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    worksheet.addRow(["Master Formula (PROSEDUR PRODUKSI INDUK)"]);
    worksheet.addRow([`Print On : ${new Date().toLocaleString()}`]);
    worksheet.addRow([``]);


    // Add headers
    const headers = Object.keys(result[0]);
    worksheet.addRow(headers);

    // Add data
    result.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Format cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.columns.forEach(column => {
      column.width = column.values.reduce((max, val) => Math.max(max, val.toString().length), 10);
    });
    worksheet.getCell('A1').font = { size: 12, bold: true };
    worksheet.getRow(4).font = { size: 9, bold: true };
    worksheet.mergeCells('A1:G1');
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ppi_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};

const exportStatusPembuat = async (req, res) => {
  const { PPI_ProductID } = req.query;

  try {
    let strSQL;

    if (!PPI_ProductID) {
      strSQL = `
        SELECT DISTINCT
          A.PPI_ProductID,
          C.Product_Name,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          D.PPI_Description
        FROM vw_PPI_Item_PRC_Status_Export_to_David AS A
        LEFT JOIN m_ppi_detail_not_produksi AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_product AS C
          ON C.Product_ID = A.PPI_ProductID
        LEFT JOIN m_PPI_Type_Owner AS D
          ON D.PPI_Format = A.PPI_ID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    } else {
      strSQL = `
        SELECT DISTINCT
          A.PPI_ProductID,
          C.Product_Name,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          D.PPI_Description
        FROM vw_PPI_Item_PRC_Status_Export_to_David AS A
        LEFT JOIN m_ppi_detail_not_produksi AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_product AS C
          ON C.Product_ID = A.PPI_ProductID
        LEFT JOIN m_PPI_Type_Owner AS D
          ON D.PPI_Format = A.PPI_ID
        WHERE A.PPI_ProductID = :PPI_ProductID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ProductID },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    worksheet.addRow(["Excel Report"]);
    worksheet.addRow([`Print On : ${new Date().toLocaleString()}`]);
    worksheet.addRow([``]);

    // Add headers
    const headers = Object.keys(result[0]);
    worksheet.addRow(headers);

    // Add data
    result.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Format cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.columns.forEach(column => {
      column.width = column.values.reduce((max, val) => Math.max(max, val.toString().length), 10);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ppi_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};

const getPPIGridData = async (req, res) => {
  const { PPI_ID, PPI_SubID = "", PPI_ProductID, PPI_ProductInit } = req.query;

  if (!PPI_ID  || !PPI_ProductID || !PPI_ProductInit) {
    return res.status(400).send({ message: "All parameters (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit) are required" });
  }

  try {
    const strSQL = `
      SELECT
        PPI_ItemID,
        ISNULL(group_name, 'OBAT JADI') AS group_name,
        CASE
          WHEN ISNULL(A.item_name, '') = ''
          THEN B.Product_Name
          ELSE A.Item_Name
        END AS item_name,
        item_size,
        PPI_QTY AS PPI_QTY,
        PPI_UnitID
      FROM
        vwPPIDetailwithItem AS A
      LEFT JOIN
        (
          SELECT
            Product_ID,
            Product_Name
          FROM
            m_product
          WHERE
            Product_Name LIKE 'pelarut%'
            OR Product_Name LIKE '%water%'
            OR Product_Name LIKE '%infer%'
        ) AS B
        ON A.PPI_ItemID = B.Product_ID
      WHERE
        PPI_ID LIKE :PPI_ID
        AND PPI_SubID LIKE :PPI_SubID
        AND PPI_ProductID LIKE :PPI_ProductID
        AND PPI_ProductInit = :PPI_ProductInit
      ORDER BY
        PPI_SeqID
    `;

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: 'Data Not Found' });
    }

    const resp = {
      message: 'OK',
      data: result,
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const exportToExcel = async (req, res) => {
  const { PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_SubID } = req.query;

  try {
    let strSQL;

    if (PPI_ID && PPI_ProductID && PPI_ProductInit) {
      strSQL = `
        SELECT
          b.PPI_Owner,
          b.PPI_Description,
          a.PPI_ID,
          a.PPI_SubID,
          a.PPI_ProductID,
          b.Product_Name,
          b.PPI_BatchSize,
          b.PPI_BatchSizeUnitID,
          b.PPI_Kemasan,
          a.PPI_SeqID,
          a.PPI_ItemID,
          a.Group_Name,
          a.Item_Name,
          a.Item_Size,
          a.PPI_QTY,
          a.PPI_UnitID
        FROM vwPPIDetailWithItem_template a
        LEFT JOIN vwPPIHeaderWithProductOwner_template b
          ON a.PPI_ID = b.PPI_ID
          AND a.PPI_SubID = b.PPI_SubID
          AND a.PPI_ProductID = b.PPI_ProductID
          AND a.PPI_ProductInit = b.PPI_ProductInit
        WHERE b.isActive = 1
          AND b.PPI_Status = 'A'
          AND a.PPI_ID LIKE :PPI_ID
          ${PPI_SubID ? `AND a.PPI_SubID LIKE :PPI_SubID` : ''}
          AND a.PPI_ProductID LIKE :PPI_ProductID
          AND a.PPI_ProductInit = :PPI_ProductInit
        ORDER BY a.PPI_ProductID, a.PPI_SubID, a.PPI_ID, a.PPI_SeqID
      `;
    } else {
      strSQL = "SELECT * FROM vwPPI_PRINT_template";
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    worksheet.addRow(["Master Formula (PROSEDUR PRODUKSI INDUK)"]);
    worksheet.addRow([`Print On : ${new Date().toLocaleString()}`]);
    worksheet.addRow([``]);

    // Add headers
    const headers = Object.keys(result[0]);
    worksheet.addRow(headers);

    // Add data
    result.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Format cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.columns.forEach(column => {
      column.width = column.values.reduce((max, val) => Math.max(max, val.toString().length), 10);
    });
    worksheet.getCell('A1').font = { size: 12, bold: true };
    worksheet.getRow(4).font = { size: 9, bold: true };
    worksheet.mergeCells('A1:G1');
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ppi_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};

const exportStatus = async (req, res) => {
  const { PPI_ProductID } = req.query;

  try {
    let strSQL;

    if (!PPI_ProductID) {
      strSQL = `
        SELECT DISTINCT
          '' AS PPI_ID,
          D.Product_Name,
          A.PPI_ProductID,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          C.PPI_Description
        FROM vw_PPI_Item_PRC_Status AS A
        LEFT JOIN m_ppi_detail_not_produksi_temp AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_PPI_Type_Owner AS C
          ON C.PPI_Format = A.PPI_ID
        LEFT JOIN m_product AS D
          ON D.Product_ID = A.PPI_ProductID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    } else {
      strSQL = `
        SELECT DISTINCT
          '' AS PPI_ID,
          D.Product_Name,
          A.PPI_ProductID,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          C.PPI_Description
        FROM vw_PPI_Item_PRC_Status AS A
        LEFT JOIN m_ppi_detail_not_produksi_temp AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_PPI_Type_Owner AS C
          ON C.PPI_Format = A.PPI_ID
        LEFT JOIN m_product AS D
          ON D.Product_ID = A.PPI_ProductID
        WHERE A.PPI_ProductID = :PPI_ProductID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ProductID },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    worksheet.addRow(["Excel Report"]);
    worksheet.addRow([`Print On : ${new Date().toLocaleString()}`]);
    worksheet.addRow([``]);

    // Add headers
    const headers = Object.keys(result[0]);
    worksheet.addRow(headers);

    // Add data
    result.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Format cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.columns.forEach(column => {
      column.width = column.values.reduce((max, val) => Math.max(max, val.toString().length), 10);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=status_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};

module.exports = {exportStatus, exportToExcel, getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems, getPPI, exportPPI, exportStatusPembuat, getPPIGridData };
