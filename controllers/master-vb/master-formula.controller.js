const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { getPagination, getPagingData } = require("../../helpers/pagination");
const { Sequelize } = require("../../models");

const { QueryTypes } = require("sequelize");

const getPPIDescription = async (req, res) => {
  try {
      const result = await sequelizeMSQL.query(
          "SELECT distinct PPI_Description FROM m_PPI_Type_Owner",
          {
              type: QueryTypes.SELECT
          }
      );

      if (result.length === 0) {
          return res.status(404).send({ message: "No data found" });
      }

      const resp = {
        message: 'OK',
        data: result
      };
      return res.status(200).send(resp);
  } catch (error) {
      return res.status(500).send({ message: error.message });
  }
};

const getPPIFormat = async (req, res) => {
  const { PPI_Description, PPI_Owner } = req.query;

  if (!PPI_Description || !PPI_Owner) {
      return res.status(400).send({ message: "PPI_Description and PPI_Owner are required" });
  }

  try {
      const result = await sequelizeMSQL.query(
          "SELECT PPI_Format FROM m_PPI_Type_Owner WHERE PPI_Description LIKE :PPI_Description AND PPI_Owner LIKE :PPI_Owner",
          {
              replacements: {
                  PPI_Description: `%${PPI_Description}%`,
                  PPI_Owner: `%${PPI_Owner}%`
              },
              type: QueryTypes.SELECT
          }
      );

      if (result.length === 0) {
          return res.status(404).send({ message: "No data found" });
      }

      const PPI_Format = result[0].PPI_Format;
      let ItemType = "BK";
      let ItemSubType = "S";

      if (PPI_Description.toUpperCase().includes("PENGOLAHAN")) {
          ItemType = "BB";
          ItemSubType = "P";
      } else if (PPI_Description.toUpperCase().includes("PRIMER")) {
          ItemType = "BK";
          ItemSubType = "P";
      }

      const resp = {
          message: 'OK',
          data: {
              PPI_Format,
              ItemType,
              ItemSubType
          }
      };

      return res.status(200).send(resp);
  } catch (error) {
      return res.status(500).send({ message: error.message });
  }
};

const getOwner = async (req, res) => {
  try {
      const result = await sequelizeMSQL.query(
          "SELECT distinct PPI_Owner FROM m_PPI_Type_Owner",
          {
              type: QueryTypes.SELECT
          }
      );

      if (result.length === 0) {
          return res.status(404).send({ message: "No data found" });
      }

      const resp = {
        message: 'OK',
        data: result

      }
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
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "Data Not Found" });
    }

    const resp = {
      message: 'OK',
      data: result
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};

const getPPIItems = async (req, res) => {
  const { PPI_ProductID, PPI_ID } = req.query;

  if (!PPI_ProductID || !PPI_ID) {
    return res.status(400).send({ message: "PPI_ProductID and PPI_ID are required" });
  }

  if (!PPI_ID.includes("/PP/")) {
    return res.status(400).send({ message: "Invalid PPI_ID format" });
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

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ProductID },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "Data Not Found" });
    }

    const resp = {
      message: 'OK',
      data: result
    };

    return res.status(200).send(resp);
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
};


module.exports = { getPPIDescription, getPPIFormat, getOwner, getProduct, getPPIItems };