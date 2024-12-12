const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { Sequelize } = require("../../models");

async function masterBahanAwalTemplate_CREATE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    let {
      item_ID,
      item_name,
      item_kodeGenerik,
      item_groupID,
      item_type,
      item_size,
      item_description,
      Item_Currency = 'IDR',
      item_price = '0',
      item_unit,
      item_minOrder = '',
      item_leadTime = '',
      item_packingSize = '',
      item_localIndent,
      strInput = '0',
      username,
      delegatedTo,
      owner,
      isHalal,
      row,
      itemStatus = '1'
    } = req.body

    const PK_ID = await getPKID() || null;

    if (!PK_ID || PK_ID?.length <= 0) throw new Error(`Failed to get PK_ID, check db connection`);

    if (!item_ID && !item_groupID) throw new Error(`Item ID or Item Group Id Cannot be undefined`)

    if (!item_ID && item_groupID) {
      item_ID = await getItemIdByGroupId(item_groupID);
    }

    const queryInsert = `
    INSERT INTO [m_Item_Manufacturing_template] (
        PK_ID,
        isactive,
        Item_ID,
        Item_Name,
        Item_BPOMGenerik,
        Item_group,
        Item_type,
        item_size,
        item_Description,
        Item_Currency,
        item_price,
        item_unit,
        Item_MinOrder,
        Item_LeadTime,
        Item_PackingSize,
        Item_LocalIndent,
        Item_MonthUjiUlang,
        User_ID,
        Delegated_To,
        Process_Date,
        item_isPPI,
        Owner,
        IsHalal,
        item_row,
        Item_Status
    )
    VALUES (
        ${PK_ID},                           -- Primary Key ID, dynamically generated
        1,                                  -- isActive
        '${item_ID}',                       -- Item_ID (string)
        '${item_name}',                     -- Item_Name (string)
        '${item_kodeGenerik}',              -- Item_BPOMGenerik (string)
        '${item_groupID}',                  -- Item_group (string)
        '${item_type}',                     -- Item_type (string)
        '${item_size}',                     -- item_size (string)
        '${item_description}',              -- item_Description (string)
        '${Item_Currency}',                 -- Item_Currency (string)
        ${item_price},                      -- item_price (number)
        '${item_unit}',                     -- item_unit (string)
        '${item_minOrder}',                 -- Item_MinOrder (string)
        '${item_leadTime}',                 -- Item_LeadTime (string)
        '${item_packingSize}',              -- Item_PackingSize (string)
        '${item_localIndent}',              -- Item_LocalIndent (string)
        0,                                  -- Item_MonthUjiUlang (number, default to 0)
        '${username}',                      -- User_ID (string)
        '${delegatedTo}',                   -- Delegated_To (string)
        GETDATE(),                          -- Process_Date (current timestamp)
        '1',                                -- item_isPPI (string)
        '${owner}',                         -- Owner (string)
        ${isHalal},                         -- IsHalal (number)
        '${row}',                           -- item_row (string)
        '${itemStatus}'                     -- Item_Status (string)
    );
    `;

    const insertData = await sequelizeMSQL.query(queryInsert, {
      type: Sequelize.QueryTypes.INSERT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', query);
      },
      transaction
    })

    // await transaction.rollback();
    await transaction.commit();

    const resp = {
      message: 'OK',
      data: null,
    }
    return res.status(201).json(resp);
  } catch (error) {
    console.log({error});
    await transaction.rollback();
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error'
    });
  }
}

async function masterBahanAwalTemplate_UPDATE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { item_ID, ...fieldsToUpdate } = req.body;

    if (!item_ID) {
      return res.status(400).json({
        message: "Item_ID is required.",
      });
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        message: "No fields provided to update.",
      });
    }

    const setClause = Object.entries(fieldsToUpdate)
      .map(([key, value]) => {
        const escapedValue =
          typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : value;
        return `${key} = ${escapedValue}`;
      })
      .join(", ");

    const queryUpdate = `
      UPDATE [m_Item_Manufacturing_template]
      SET ${setClause},
          Process_date = GETDATE() -- Always update the process date
      WHERE
          Item_ID = '${item_ID}'
          AND ISNULL(item_periode, '') = '';
    `;

    const updatedData = await sequelizeMSQL.query(queryUpdate, {
      type: Sequelize.QueryTypes.UPDATE,
      logging: (query, queryObject) => {
      },
      transaction
    });

    await transaction.commit();
    // await transaction.rollback();

    const resp = {
      message: "OK",
      data: null,
    };
    return res.status(200).json(resp);
  } catch (error) {
    console.log({ error });
    await transaction.rollback();
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error'
    });
  }
}

async function masterBahanAwalTemplate_DELETE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { item_ID } = req.body;

    if (!item_ID) {
      return res.status(400).json({
        message: "Item_ID is required.",
      });
    }

    const cekBonKeluarData = await checkItemBeforeDelete(item_ID) || null;

    if (!cekBonKeluarData || cekBonKeluarData?.length <= 0) {
      const ppiCount = await countJumlahPPI(item_ID);

      if (ppiCount > 0) {
        const updateQuery1 = `
          UPDATE m_Item_Manufacturing_supplier_template
          SET isActive = 0
          WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
        `;
        const updateQuery2 = `
          UPDATE m_Item_Manufacturing_template
          SET isActive = 0
          WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
        `;

        await sequelizeMSQL.query(updateQuery1, {
          replacements: { item_ID },
          transaction,
        });
        await sequelizeMSQL.query(updateQuery2, {
          replacements: { item_ID },
          transaction,
        });
      } else {
        const deleteQuery1 = `
          DELETE FROM m_Item_Manufacturing_supplier_template
          WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
        `;
        const deleteQuery2 = `
          DELETE FROM m_Item_Manufacturing_template
          WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
        `;

        await sequelizeMSQL.query(deleteQuery1, {
          replacements: { item_ID },
          transaction,
        });
        await sequelizeMSQL.query(deleteQuery2, {
          replacements: { item_ID },
          transaction,
        });
      }
    }

    if (cekBonKeluarData?.length > 0) {
      const updateQuery1 = `
        UPDATE m_Item_Manufacturing_supplier_template
        SET isActive = 0
        WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
      `;
      const updateQuery2 = `
        UPDATE m_Item_Manufacturing_template
        SET isActive = 0
        WHERE ISNULL(item_periode, '') = '' AND item_id LIKE :item_ID
      `;

      await sequelizeMSQL.query(updateQuery1, {
        replacements: { item_ID },
        transaction,
      });
      await sequelizeMSQL.query(updateQuery2, {
        replacements: { item_ID },
        transaction,
      });
    }

    await transaction.commit();

    const resp = {
      message: "Operation completed successfully.",
      data: null,
    };
    return res.status(200).json(resp);
  } catch (error) {
    await transaction.rollback();
    console.log({ error });
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error'
    });
  }
}

async function masterBahanAwalTemplate_APPROVE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { TxtGroup_ID, gstrUserName, gstrDelegatedTo } = req.body;

    if (!TxtGroup_ID || TxtGroup_ID.trim() === "") {
      return res.status(500).json({
        message: "Group KODE tidak boleh dikosongkan !!!",
      });
    }

    // Step 1: Get current date and time
    const [{ perio, GetNow: sqlDtTime }] = await sequelizeMSQL.query(
      `
      SELECT
        REPLACE(CONVERT(VARCHAR(19), GETDATE(), 121), '-', '') AS perio,
        CONVERT(VARCHAR, GETDATE(), 20) AS GetNow
      `,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const sqlPeriode = perio;

    // Step 2: Check Approver Identity
    const approver = await sequelizeMSQL.query(
      `
      SELECT TOP 1 Appr_Identity
      FROM m_Approver_Lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'ITEM'
        AND Appr_ID LIKE :gstrUserName
      `,
      {
        replacements: { gstrUserName },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (!approver || approver.length === 0) {
      return res.status(500).json({
        message: "Can not approve data",
      });
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || "0000";

    // Step 3: Build queries
    const xSQL1 = `
      UPDATE m_Item_Manufacturing_Supplier_template
      SET
        item_Periode = :sqlPeriode,
        tgl_berlaku = :sqlDtTime,
        user_approve = :gstrUserName,
        user_delegated = :gstrDelegatedTo
      WHERE ISNULL(item_Periode, '') = ''
        AND Item_ID IN (
          SELECT DISTINCT Item_ID
          FROM m_Item_Manufacturing_template
          WHERE ISNULL(item_Periode, '') = ''
            AND Item_Group = :TxtGroup_ID
        );

      UPDATE m_Item_Manufacturing_template
      SET
        item_Periode = :sqlPeriode,
        tgl_berlaku = :sqlDtTime,
        user_approve = :gstrUserName,
        user_delegated = :gstrDelegatedTo
      WHERE ISNULL(item_Periode, '') = ''
        AND Item_Group = :TxtGroup_ID;
    `;

    const xSQL2 = `
      INSERT INTO m_Item_Manufacturing_Status (
        Item_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To
      )
      SELECT
        Item_ID, 1, 0, :sqlAppr_Identity, :sqlDtTime, :gstrUserName, :gstrDelegatedTo
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode
        AND Item_Group = :TxtGroup_ID;
    `;

    const zSQL1 = `
      UPDATE m_Item_Manufacturing_Supplier
      SET
        USER_ID = :gstrUserName,
        Delegated_To = :gstrDelegatedTo,
        flag_update = 'Update For Delete'
      WHERE Item_ID IN (
        SELECT DISTINCT Item_ID
        FROM m_Item_Manufacturing
        WHERE Item_Group = :TxtGroup_ID
      );

      DELETE FROM m_Item_Manufacturing_Supplier
      WHERE Item_ID IN (
        SELECT DISTINCT Item_ID
        FROM m_Item_Manufacturing
        WHERE Item_Group = :TxtGroup_ID
      );
    `;

    const zSQL3 = `
      INSERT INTO m_Item_Manufacturing_Supplier_template (
        Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive,
        Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date,
        Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat,
        Masa_berlaku_date, Dok_Pendukung, item_Periode, tgl_berlaku, user_approve, user_delegated
      )
      SELECT
        Item_ID, Item_PrcID, Item_SuppID, :sqlDtTime, :gstrUserName, :gstrDelegatedTo, isActive,
        Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date,
        Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat,
        Masa_berlaku_date, Dok_Pendukung, NULL, NULL, NULL, NULL
      FROM m_Item_Manufacturing_Supplier_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;

    const vSQL1 = `
      UPDATE m_Item_Manufacturing
      SET
        USER_ID = :gstrUserName,
        Delegated_To = :gstrDelegatedTo,
        flag_update = 'Update For Delete'
      WHERE Item_Group = :TxtGroup_ID;

      DELETE FROM m_Item_Manufacturing
      WHERE Item_Group = :TxtGroup_ID;
    `;

    const vSQL2 = `
      INSERT INTO m_Item_Manufacturing (
        PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description,
        Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime,
        Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency,
        Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Delegated_To,
        Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime,
        Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate,
        Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
      )
      SELECT
        PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description,
        Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime,
        Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency,
        Item_LastPrice, Item_LastPriceDate, 1, Item_BJ, :gstrUserName, :gstrDelegatedTo,
        :sqlDtTime, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime,
        Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate,
        Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;


    await sequelizeMSQL.query(xSQL1, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        gstrUserName,
        gstrDelegatedTo,
        TxtGroup_ID,
      },
      transaction,
    });

    await sequelizeMSQL.query(xSQL2, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        sqlAppr_Identity,
        gstrUserName,
        gstrDelegatedTo,
        TxtGroup_ID,
      },
      transaction,
    });

    await sequelizeMSQL.query(zSQL1, {
      replacements: { TxtGroup_ID, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    await sequelizeMSQL.query(zSQL3, {
      replacements: { sqlPeriode, sqlDtTime, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    await sequelizeMSQL.query(vSQL1, {
      replacements: { TxtGroup_ID, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    await sequelizeMSQL.query(vSQL2, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        gstrUserName,
        gstrDelegatedTo,
      },
      transaction,
    });

    await transaction.commit();
    // await transaction.rollback();
    return res.status(200).json({
      message: "Data has been approved for this period!",
    });
  } catch (error) {
    const resp = {
      message: "ERROR",
    }
    await transaction.rollback();
    console.log({error, name: error?.name});
    if(error?.name == 'SequelizeUniqueConstraintError' ) resp['data'] = 'Data Sudah Approve'
    return res.status(500).json(resp);
  }
}


async function countJumlahPPI(item_ID) {
  try {

    const queryString = `
    SELECT
    COUNT(*) AS jum
    FROM
    m_PPI_Detail A
    LEFT JOIN
    m_PPI_header B
    ON
        A.PPI_ID = B.PPI_ID
        AND A.PPI_SubID = B.PPI_SubID
        AND A.PPI_ProductID = B.PPI_ProductID
        AND A.PPI_ProductInit = B.PPI_ProductInit
    WHERE
    A.PPI_ItemID = :item_ID;
    `
    const [data] = await sequelizeMSQL.query(queryString, {
      replacements: {
        item_ID: `${item_ID}`
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', queryObject);
      },
    })

    console.log({PPICount: data?.jum});

    return data?.jum
  } catch (error) {
    console.log({error});
    return null;
  }
}

async function checkItemBeforeDelete(item_ID) {
  try {

    const queryString = `
    SELECT TOP 1
      MR_ItemID AS item_id
    FROM
      t_Bon_Keluar_Bahan_Awal_Detail
    WHERE
      MR_ItemID = :item_ID

    UNION ALL

    SELECT TOP 1
      BPP_ItemID AS item_id
    FROM
      t_BPP_Manufacturing_Detail
    WHERE
      BPP_ItemID = :item_ID

    UNION ALL

    SELECT TOP 1
      TTBA_ItemID AS item_id
    FROM
      t_TTBA_Manufacturing_Detail
    WHERE
      TTBA_ItemID = :item_ID
    `
    const data = await sequelizeMSQL.query(queryString, {
      replacements: {
        item_ID: `${item_ID}`
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', queryObject);
      },
    })

    console.log(data);

    return data
  } catch (error) {
    console.log({error});
    return null;
  }
}

async function getItemIdByGroupId (item_group) {
  try {

    const queryString = `
    SELECT
    '${item_group} ' +
    RIGHT(
        '00' +
        CAST(
            CAST(
                ISNULL(
                    SUBSTRING(MAX(Item_ID), CHARINDEX(' ', MAX(Item_ID)) + 1, 3),
                    0
                ) AS INTEGER
            ) + 1 AS VARCHAR
        ),
        3
    )
    FROM
        m_Item_Manufacturing_template
    WHERE Item_ID LIKE ':item_group_like'
    `
    const [data] = await sequelizeMSQL.query(queryString, {
      replacement: {
        item_group_like: `${item_group}%`
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        console.log('Executing query:', query);
      },
    })

    console.log({data: data['']});

    return data['']

  } catch (error) {
    console.log({error});
    return null;
  }
}

async function getPKID() {
  try {
    const queryString = `SELECT MAX(PK_ID) + 1 as PKID from m_item_Manufacturing_template where ISNULL(item_Periode,'') = '' `

    const [data] = await sequelizeMSQL.query(queryString, {
      type: Sequelize .QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', query);
      },
    })
    // console.log({data});
    if (data) return data?.PKID;

    return null;
  } catch (error) {
    console.log({error});
    return null;
  }
}


 module.exports = { masterBahanAwalTemplate_CREATE, masterBahanAwalTemplate_UPDATE, masterBahanAwalTemplate_DELETE, masterBahanAwalTemplate_APPROVE }