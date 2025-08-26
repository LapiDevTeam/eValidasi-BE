const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const { Sequelize } = require('../../models');
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const logoPath = path.resolve(__dirname, '../../assets/LapiLogo.jpg');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const ExcelJS = require('exceljs');

const getManager = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;

    if (!user_id || user_id === '') user_id = req.query?.user_id;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request!');
    const query = `
    select top 5 nama, jabatan, user_id, inisialName from m_karyawan where isActive = 1 and Bagian = '${bagian_user}' and Job_LevelID = 3
    `;

    const data = await sequelizeMSQL.query(query, {
      type: QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', query);
      },
    });

    if (!data || data.length <= 0) {
      return res.status(404).json({ message: 'Manager not found for this user.' });
    }

    return res.status(200).json({ manager: data });

  } catch (error) {
    console.log(error, "<<");
    next(error);
  }
};

const masterBahanAwalTemplate_CREATE = async (req, res) => {
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    let {
      item_ID,
      item_name,
      item_kodeGenerik,
      item_groupID,
      item_type,
      item_size,
      item_description,
      item_unit,
      item_minOrder = '',
      item_leadTime = '',
      item_packingSize = '',
      item_localIndent,
      strInput = '0',
      username = user_id,
      delegatedTo = delegated_to,
      owner = bagian_user,
      isHalal,
      row,
      itemStatus = '1',
      existingItem = false,
    } = req.body;

    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request!');
    let lblItem_ID = '';

    if (!item_groupID || !item_name) {
      return res.status(400).json({ message: 'Nama Barang harus diisi dan tidak boleh kosong!!!' });
    }

    if (!item_unit) {
      return res.status(400).json({ message: 'Satuan harus diisi!' });
    }

    lblItem_ID = await generateItemID(item_groupID);

    if (item_ID && item_ID !== '' && existingItem === true) {
      console.log({existingItem, item_ID, item_groupID});

      // Handle decimal notation like "BR 181.002"
      if (item_ID.includes('.')) {
        const parts = item_ID.split(' ');
        const prefix = parts[0]; // e.g., "BR"

        if (parts.length >= 2) {
          const decimalPart = parts[1]; // e.g., "181.002"

          if (decimalPart.includes('.')) {
            // First check if the item exists in the database
            const checkQuery = `
              SELECT COUNT(*) as itemCount
              FROM m_Item_Manufacturing_template
              WHERE Item_ID = :itemId AND isActive = 1
            `;

            const [existResult] = await sequelizeMSQL.query(checkQuery, {
              replacements: { itemId: item_ID },
              type: QueryTypes.SELECT,
            });

            if (existResult && existResult.itemCount > 0) {
              // Item exists, so increment the decimal suffix
              const [basePart, decimalSuffix] = decimalPart.split('.');

              if (!isNaN(decimalSuffix)) {
                const incrementedSuffix = (parseInt(decimalSuffix) + 1).toString().padStart(decimalSuffix.length, '0');
                lblItem_ID = `${prefix} ${basePart}.${incrementedSuffix}`;
              } else {
                // If suffix isn't numeric, fall back to the original ID
                lblItem_ID = item_ID;
              }
            } else {
              // Item doesn't exist, use the original ID
              lblItem_ID = item_ID;
            }
          } else {
            // If no decimal but there's a space, add 001
            lblItem_ID = `${item_ID} 001`;
          }
        } else {
          lblItem_ID = `${item_ID} 001`;
        }
      } else {
        // For non-decimal IDs, use original logic
        const getMiddleCode = (item_ID) => {
          if (!item_ID) return '';
          const parts = item_ID.split(' ');
          return parts.length >= 2 ? parts[1] : '';
        };

        const middleCode = getMiddleCode(item_ID);
        console.log({ middleCode });

        // Get the latest item_ID from database for this group with same middle code
        let query = `
          SELECT TOP 1 item_ID
          FROM m_Item_Manufacturing_template
          WHERE item_group = :item_group
        `;

        // Add middle code condition if it exists
        if (middleCode && middleCode !== '') {
          query += ` AND item_ID LIKE :item_pattern `;
        }

        query += ` ORDER BY item_ID DESC`;

        const replacements = { item_group: item_groupID };
        if (middleCode && middleCode !== '') {
          replacements.item_pattern = `${item_groupID} ${middleCode} %`;
        }

        const [latestItem] = await sequelizeMSQL.query(query, {
          replacements,
          type: QueryTypes.SELECT,
        });

        if (latestItem && latestItem.item_ID) {
          const latestItemID = latestItem.item_ID;
          const parts = latestItemID.split(' ');

          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];

            // Handle .000 suffix for non-RH items
            if (lastPart.includes('.')) {
              const [number, suffix] = lastPart.split('.');
              if (!isNaN(number) && number !== '') {
                const incrementedNumber = (parseInt(number) + 1).toString().padStart(number.length, '0');
                parts[parts.length - 1] = `${incrementedNumber}.${suffix}`;
                lblItem_ID = parts.join(' ');
              } else {
                // If number part is invalid, default to 001.000
                parts[parts.length - 1] = `001.${suffix}`;
                lblItem_ID = parts.join(' ');
              }
            } else if (!isNaN(lastPart) && lastPart !== '') {
              // Handle numeric-only last part
              const incrementedNumber = (parseInt(lastPart) + 1).toString().padStart(lastPart.length, '0');
              parts[parts.length - 1] = incrementedNumber;
              lblItem_ID = parts.join(' ');
            } else {
              // If lastPart contains non-numeric characters, extract numeric part
              const numericMatch = lastPart.match(/(\d+)/);
              if (numericMatch) {
                const numericPart = numericMatch[1];
                const incrementedNumber = (parseInt(numericPart) + 1).toString().padStart(numericPart.length, '0');
                // Replace the numeric part while keeping non-numeric characters
                const newLastPart = lastPart.replace(/\d+/, incrementedNumber);
                parts[parts.length - 1] = newLastPart;
                lblItem_ID = parts.join(' ');
              } else {
                // If no numeric part found, append "001"
                lblItem_ID = `${latestItemID} 001`;
              }
            }
          }
        } else {
          // If no items found with middle code, create new one with middle code + "001"
          if (middleCode && middleCode !== '') {
            lblItem_ID = `${item_groupID} ${middleCode} 001`;
          } else {
            lblItem_ID = `${item_ID} 001`;
          }
        }
      }
    }

    if (item_ID && item_ID !== '' && (existingItem === false || !existingItem)) {
      lblItem_ID = item_ID;
    }

    console.log({ lblItem_ID });
    if (item_type === 'BAHAN KEMAS') {
      const query3 = `
                SELECT Item_MonthUjiUlang
                FROM t_item_manuf_ujiulangDefault
                WHERE item_id LIKE '${item_groupID}'
            `;

      const [ujiulangResult] = await sequelizeMSQL.query(query3, { type: QueryTypes.SELECT });
      if (ujiulangResult) {
        console.log(`Default Uji Ulang Period: ${ujiulangResult.Item_MonthUjiUlang} bulan`);
      }
    }

    const query4 = `
            SELECT MAX(PK_ID) + 1 AS PKID
            FROM m_Item_Manufacturing_template
            WHERE ISNULL(item_Periode, '') = ''
        `;

    const [pkidResult] = await sequelizeMSQL.query(query4, { type: QueryTypes.SELECT });
    let PK_ID = pkidResult ? pkidResult.PKID : 1;
    console.log({ pkidResult, PK_ID });
    const insertQuery = `
            INSERT INTO m_Item_Manufacturing_template (
                PK_ID, isactive, Item_ID, Item_Name, Item_BPOMGenerik, Item_group, Item_type,
                item_size, item_Description, Item_Currency, item_price, item_unit, Item_MinOrder,
                Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_MonthUjiUlang,
                User_ID, Delegated_To, Process_Date, item_isPPI, Owner, IsHalal, item_row, Item_Status
            ) VALUES (
                '${PK_ID}', 1, '${lblItem_ID}', '${item_name}', '${item_kodeGenerik}', '${item_groupID}',
                '${item_type}', '${item_size}', '${item_description}', 'IDR', '0', '${item_unit}', '${item_minOrder}',
                '${item_leadTime}', '${item_packingSize}', '${item_localIndent}', '${strInput}',
                '${user_id}', '${delegated_to}', GETDATE(), 1, '${bagian_user}', '${isHalal}', '${row}', '${itemStatus}'
            )
        `;
    console.log({ user: req.user, insertQuery });
    await sequelizeMSQL.query(insertQuery, { type: QueryTypes.INSERT });

    return res.status(201).json({ message: `Data berhasil disimpan dengan kode: ${lblItem_ID}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data.', error: error.message });
  }
};

async function masterBahanAwalTemplate_CREATE_BAK(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
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
      username = user_id,
      delegatedTo = delegated_to,
      owner = bagian_user,
      isHalal,
      row,
      itemStatus = '1',
    } = req.body;

    const PK_ID = (await getPKID()) || null;

    if (!PK_ID || PK_ID?.length <= 0) throw new Error(`Failed to get PK_ID, check db connection`);

    if (!item_ID && !item_groupID) throw new Error(`Item ID or Item Group Id Cannot be undefined`);

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
      transaction,
    });

    // await transaction.rollback();
    await transaction.commit();

    const resp = {
      message: 'OK',
      data: null,
    };
    return res.status(201).json(resp);
  } catch (error) {
    console.log({ error });
    await transaction.rollback();
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error',
    });
  }
}

async function masterBahanAwalTemplate_UPDATE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { item_ID, insertRevisi = false, txtUkuranHistory = '', ...fieldsToUpdate } = req.body;

    if (!item_ID) {
      return res.status(400).json({
        message: 'Item_ID is required.',
      });
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({
        message: 'No fields provided to update.',
      });
    }

    const setClause = Object.entries(fieldsToUpdate)
      .map(([key, value]) => {
        const escapedValue = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
        return `${key} = ${escapedValue}`;
      })
      .join(', ');

    if (insertRevisi && (txtUkuranHistory || txtUkuranHistory !== '')) {
      const queryGetPrs = `
        select A.Item_PrcID,B.Prc_Name
        from m_Item_Manufacturing_supplier A
        LEFT JOIN m_principle B on B.Prc_ID=A.Item_PrcID
        where A.Item_ID='${item_ID}'
        `;

      const resultGetPrs = await sequelizeMSQL.query(queryGetPrs, {
        type: Sequelize.QueryTypes.SELECT,
        logging: (query, queryObject) => {},
      });

      if (resultGetPrs?.length <= 0) {
        console.log({ resultGetPrs: resultGetPrs[0] });

        const insertPromises = resultGetPrs[0].map(async (element) => {
          const item_nameRevisi = setClause?.item_name || '';
          const item_PrcID = element?.item_PrcID || '';
          const item_prcName = element?.item_prcName || '';
          const queryInsertRevisi = `
                  INSERT INTO t_RevisionCode_Reminder
                  (Tanggal, Item_ID, Item_Name, Item_PrcID, Item_PrcName, Ukuran_Lama, update_as_status)
                  VALUES (
                      GETDATE(),
                      '${item_ID}',
                      '${item_nameRevisi}',
                      '${item_PrcID}',
                      '${item_prcName}',
                      '${txtUkuranHistory}',
                      'update'
                  )
              `;

          return sequelizeMSQL.query(queryInsertRevisi, {
            type: Sequelize.QueryTypes.INSERT,
            logging: (query, queryObject) => {},
            transaction,
          });
        });

        try {
          const insertRevisiResults = await Promise.all(insertPromises);
          console.log('Insert operations completed:', insertRevisiResults);
        } catch (error) {
          console.error('Error in inserting data:', error);
        }
      }
    }

    const queryUpdate = `
      UPDATE [m_Item_Manufacturing_template]
      SET ${setClause},
          Process_date = GETDATE()
      WHERE
          Item_ID = '${item_ID}'
          AND ISNULL(item_periode, '') = '';
    `;

    const updatedData = await sequelizeMSQL.query(queryUpdate, {
      type: Sequelize.QueryTypes.UPDATE,
      logging: (query, queryObject) => {
        console.log({ query });
      },
      transaction,
    });

    console.log({ updatedData });
    await transaction.commit();
    // await transaction.rollback();

    const resp = {
      message: 'OK',
      data: null,
    };
    return res.status(200).json(resp);
  } catch (error) {
    console.log({ error });
    await transaction.rollback();
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error',
    });
  }
}

async function masterBahanAwalTemplate_DELETE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { item_ID } = req.body;

    if (!item_ID) {
      return res.status(400).json({
        message: 'Item_ID is required.',
      });
    }

    const cekBonKeluarData = (await checkItemBeforeDelete(item_ID)) || null;

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
      message: 'Operation completed successfully.',
      data: null,
    };
    return res.status(200).json(resp);
  } catch (error) {
    await transaction.rollback();
    console.log({ error });
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error',
    });
  }
}

async function masterBahanAwalTemplate_APPROVE(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { item_groupID, gstrUserName = user_id, gstrDelegatedTo = delegated_to } = req.body;

    if (!item_groupID || item_groupID === '') {
      return res.status(500).json({
        message: 'Group KODE tidak boleh dikosongkan !!!',
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
        message: 'Can not approve data',
      });
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || '0000';

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
            AND Item_Group = :item_groupID
        );

      UPDATE m_Item_Manufacturing_template
      SET
        item_Periode = :sqlPeriode,
        tgl_berlaku = :sqlDtTime,
        user_approve = :gstrUserName,
        user_delegated = :gstrDelegatedTo
      WHERE ISNULL(item_Periode, '') = ''
        AND Item_Group = :item_groupID;
    `;

    const xSQL2 = `
      INSERT INTO m_Item_Manufacturing_Status (
        Item_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To
      )
      SELECT
        Item_ID, 1, 0, :sqlAppr_Identity, :sqlDtTime, :gstrUserName, :gstrDelegatedTo
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode
        AND Item_Group = :item_groupID;
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
        WHERE Item_Group = :item_groupID
      );

      DELETE FROM m_Item_Manufacturing_Supplier
      WHERE Item_ID IN (
        SELECT DISTINCT Item_ID
        FROM m_Item_Manufacturing
        WHERE Item_Group = :item_groupID
      );
    `;

    const zSQL2 = `
      INSERT INTO m_Item_Manufacturing_Supplier (
        Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
      )
      SELECT
        Item_ID, Item_PrcID, Item_SuppID, :sqlDtTime AS Process_Date, :gstrUserName AS User_ID, :gstrDelegatedTo AS Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
      FROM m_Item_Manufacturing_Supplier_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode
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
      WHERE Item_Group = :item_groupID;

      DELETE FROM m_Item_Manufacturing
      WHERE Item_Group = :item_groupID;
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

    const updateQuery1 = `
    UPDATE m_Item_Manufacturing_Status
    SET USER_ID = :gstrUserName, Delegated_To = :gstrDelegatedTo, flag_update = 'Update For Delete'
    WHERE Item_ID IN (
      SELECT Item_ID
      FROM m_Item_Manufacturing
      WHERE Item_Group = :item_groupID
    )
  `;
    const deleteQuery1 = `
    DELETE FROM m_Item_Manufacturing_Status
    WHERE Item_ID IN (
      SELECT Item_ID
      FROM m_Item_Manufacturing
      WHERE Item_Group = :item_groupID
    )
  `;

    const insertQuery1 = `
    INSERT INTO m_Item_Manufacturing_template (
      PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
      Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
      User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
      Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, item_Periode, tgl_berlaku, user_approve, user_delegated
    )
    SELECT
      PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
      Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, 1 AS Item_Status, Item_BJ,
      User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
      Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, NULL AS item_Periode, NULL AS tgl_berlaku, NULL AS user_approve, NULL AS user_delegated
    FROM m_Item_Manufacturing_template
    WHERE ISNULL(item_Periode, N'') = :sqlPeriode
    `;

    await sequelizeMSQL.query(insertQuery1, {
      replacements: { sqlPeriode },
      transaction,
    });

    const resultxSQL1 = await sequelizeMSQL.query(xSQL1, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        gstrUserName,
        gstrDelegatedTo,
        item_groupID,
      },
      transaction,
    });

    const resultUpdateQuery1 = await sequelizeMSQL.query(updateQuery1, {
      replacements: { gstrUserName, gstrDelegatedTo, item_groupID },
      transaction,
    });
    const resultDeleteQuery1 = await sequelizeMSQL.query(deleteQuery1, {
      replacements: { item_groupID },
      transaction,
    });

    const resultxSQL2 = await sequelizeMSQL.query(xSQL2, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        sqlAppr_Identity,
        gstrUserName,
        gstrDelegatedTo,
        item_groupID,
      },
      transaction,
    });

    const resultzSQL1 = await sequelizeMSQL.query(zSQL1, {
      replacements: { item_groupID, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    const resultzSQL2 = await sequelizeMSQL.query(zSQL2, {
      replacements: { sqlDtTime, gstrUserName, gstrDelegatedTo, sqlPeriode },
      transaction,
    });

    const resultzSQL3 = await sequelizeMSQL.query(zSQL3, {
      replacements: { sqlPeriode, sqlDtTime, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    const resultvSQL1 = await sequelizeMSQL.query(vSQL1, {
      replacements: { item_groupID, gstrUserName, gstrDelegatedTo },
      transaction,
    });

    const resultvSQL2 = await sequelizeMSQL.query(vSQL2, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        gstrUserName,
        gstrDelegatedTo,
      },
      transaction,
    });

    console.log({
      resultxSQL1,
      resultxSQL2,
      resultzSQL1,
      resultzSQL2,
      resultzSQL3,
      resultUpdateQuery1,
      resultDeleteQuery1,
      resultvSQL1,
      resultvSQL2,
    });
    await transaction.commit();
    // await transaction.rollback();
    return res.status(200).json({
      message: 'Data has been approved for this period!',
    });
  } catch (error) {
    const resp = {
      message: 'ERROR',
    };
    await transaction.rollback();
    console.log({ error, name: error?.name });
    if (error?.name == 'SequelizeUniqueConstraintError') resp['data'] = 'Data Sudah Approve';
    return res.status(500).json(resp);
  }
}

async function masterItemPrinciple_CREATE(req, res, next) {
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  const transaction = await sequelizeMSQL.transaction();
  let statusRev = false;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const {
      item_ID,
      prc_ID,
      supp_ID,
      kodeNegara,
      isActive,
      isDefault,
      itemName,
      ukuranHistory,
      txtHalal = 'Non',
      halalExpDate,
      lembagaHalal,
      nomorSertifikatHalal,
      docPendukungHalal,
      ukuranBaru = '',
      ukuranLama = '',
    } = req.body;

    if (!item_ID) throw new Error(`Item ID wajib diisi!`);

    if (!txtHalal || txtHalal === '') throw new Error(`Harap pilih Halal/Non Halal!`);

    if (!prc_ID || prc_ID === '') throw new Error(`Harap pilih principlenya`);

    const principleDetail = await getPrcById(prc_ID);

    let isHalal = 0;
    let stringSertifikat = ``;

    if (txtHalal === 'Halal') {
      isHalal = 1;
      if (typeof lembagaHalal === 'undefined' || typeof nomorSertifikatHalal === 'undefined' || typeof halalExpDate === 'undefined') {
        stringSertifikat = '';
      } else {
        stringSertifikat = `${lembagaHalal}${nomorSertifikatHalal}${halalExpDate}`;
      }
    }

    const cekItem = await getPrinciple(item_ID);
    const cekRevisi = await getRevisi(item_ID, prc_ID);

    let [item_revisionDate, item_revisionUserID, item_revisionDelegatedTo, item_revision, item_revisionKet] = ['', '', '', '', ''];

    if (!cekRevisi) {
      const getDateTime = new Date();
      item_revision = '00';
      item_revisionDate = getDateTime.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/');
      item_revisionUserID = user_id;
      item_revisionDelegatedTo = delegated_to;
      item_revisionKet = '';
      statusRev = false;
    }
    console.log({ cekRevisi });
    if (cekRevisi) {
      item_revision = cekRevisi?.item_revision;
      item_revisionDate = cekRevisi?.item_revisionDate
        ? cekRevisi.item_revisionDate.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/')
        : '';
      item_revisionUserID = cekRevisi?.item_revisionUserId;
      item_revisionDelegatedTo = cekRevisi?.item_revisionDelegatedTo;
      item_revisionKet = cekRevisi?.item_ket;
      statusRev = true;
    }

    console.log({ cekItem, cekRevisi });
    if (cekItem && principleDetail) {
      if (!statusRev || statusRev == 0) {
        const queryRevisi = `
        INSERT into t_revisionCode_reminder(
        Tanggal,
        item_ID,
        item_name,
        item_prcID,
        item_prcName,
        Ukuran_lama,
        ukuran_Baru,
        update_as_status
        )
        VALUES (
        GETDATE(),
        '${item_ID}',
        '${cekItem?.item_name}',
        '${prc_ID}',
        '${principleDetail?.prc_name}',
        '${ukuranLama}',
        '${ukuranBaru}',
        'INSERT'
        )
        `;
        const insertResultRevisi = await sequelizeMSQL.query(queryRevisi, { type: QueryTypes.INSERT, transaction });
        console.log({ queryRevisi });
      }
    }
    console.log({ stringSertifikat });
    const queryInsert = `
    INSERT INTO m_item_Manufacturing_Supplier_template (
        Item_ID,
        item_PrcId,
        item_suppID,
        item_BPOMnegara,
        Process_date,
        User_ID,
        delegated_to,
        isActive,
        isDefault,
        item_revision,
        item_revisionDate,
        item_revisionUserID,
        item_revisionDelegatedTo,
        item_ket,
        input_date,
        item_isHalal,
        lembaga,
        nomor_sertifikat,
        masa_berlaku_date,
        dok_pendukung
    )
    VALUES (
        '${item_ID}',
        '${prc_ID}',
        '${supp_ID}',
        '${kodeNegara}',
        GETDATE(),
        '${user_id}',
        '${delegated_to}',
        ${isActive},
        ${isDefault},
        '${item_revision}',
        '${item_revisionDate}',
        '${item_revisionUserID}',
        '${item_revisionDelegatedTo}',
        '${item_revisionKet}',
        GETDATE(),
        '${isHalal}',
        ${lembagaHalal ? `'${lembagaHalal}'` : 'NULL'},
        ${nomorSertifikatHalal ? `'${nomorSertifikatHalal}'` : 'NULL'},
        ${halalExpDate ? `'${halalExpDate}'` : 'NULL'},
        ${docPendukungHalal ? `'${docPendukungHalal}'` : 'NULL'}
    );
`;

    const insertResult = await sequelizeMSQL.query(queryInsert, { type: QueryTypes.INSERT, transaction });

    await transaction.commit();
    return res.status(200).json({
      message: 'OK',
    });
  } catch (error) {
    const resp = {
      message: 'ERROR',
    };
    await transaction.rollback();
    console.log({ error, name: error?.name });
    return res.status(500).json(resp);
  }
}

async function masterItemPrinciple_UPDATE(req, res) {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const {
      item_ID,
      prc_ID,
      supp_ID,
      txtHalal,
      txtHalalMasaBerlaku,
      dtpHalalMasaBerlaku,
      lembagaHalal,
      nomorSertifikatHalal,
      docPendukungHalal,
      txtKodeNegara,
      isActive,
      isDefault,
      old_prc_ID,
      old_supp_ID,
    } = req.body;

    if (!item_ID) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Item ID tidak boleh kosong' });
    }

    if (!txtHalal) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Harap pilih Halal/Non Halal!' });
    }

    let strIsHalal;
    let strSertifikat;

    if (txtHalal === 'Halal') {
      strIsHalal = 1;
      strSertifikat = `
        , Lembaga=:lembagaHalal
        , Nomor_sertifikat=:nomorSertifikatHalal
        , Masa_berlaku_date=${txtHalalMasaBerlaku === '-' ? 'NULL' : ':dtpHalalMasaBerlaku'}
        , Dok_Pendukung=:docPendukungHalal
      `;
    } else {
      strIsHalal = 0;
      strSertifikat = `
        , Lembaga=''
        , Nomor_sertifikat=''
        , Masa_berlaku_date=NULL
        , Dok_Pendukung=''
      `;
    }

    const query1 = `
      UPDATE m_Item_Manufacturing_Supplier_template
      SET item_BPOMnegara = :txtKodeNegara,
          IsActive = :isActive,
          IsDefault = :isDefault,
          Process_Date = GETDATE(),
          [User_ID] = :user_id,
          Item_isHalal = :strIsHalal
          ${strSertifikat}
      WHERE ISNULL(item_Periode, '') = ''
        AND ISNULL(Item_ID, '') = :item_ID
        AND ISNULL(Item_PrcID, '') = :old_prc_ID;
    `;

    const query2 = `
      UPDATE m_Item_Manufacturing_Supplier_template
      SET Item_SuppID = :supp_ID,
          item_PRCID = :prc_ID,
          IsActive = :isActive,
          IsDefault = :isDefault,
          Process_Date = GETDATE(),
          [User_ID] = :user_id
      WHERE ISNULL(item_Periode, '') = ''
        AND ISNULL(Item_ID, '') = :item_ID
        AND ISNULL(Item_PrcID, '') = :old_prc_ID
        AND ISNULL(Item_SUPPID, '') = :old_supp_ID;
    `;

    // Execute raw queries with parameterized inputs
    await sequelizeMSQL.query(query1, {
      replacements: {
        txtKodeNegara,
        isActive,
        isDefault,
        user_id,
        strIsHalal,
        lembagaHalal,
        nomorSertifikatHalal,
        dtpHalalMasaBerlaku,
        docPendukungHalal,
        item_ID: item_ID,
        old_prc_ID: old_prc_ID,
      },
      transaction,
    });

    await sequelizeMSQL.query(query2, {
      replacements: {
        supp_ID,
        prc_ID,
        isActive,
        isDefault,
        user_id,
        item_ID: item_ID,
        old_prc_ID: old_prc_ID,
        old_supp_ID: old_supp_ID,
      },
      transaction,
    });

    await transaction.commit();

    res.status(200).json({ message: 'Data berhasil disimpan!' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Terjadi kesalahan. Silakan coba lagi.' });
  }
}

async function masterItemPrinciple_DELETE(req, res, next) {
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  const transaction = await sequelizeMSQL.transaction();
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { item_ID, prc_ID, supp_ID } = req.body;

    if (!item_ID || !prc_ID || !supp_ID) {
      return res.status(400).json({
        message: 'Item_ID, prc_ID, and supp_ID are required.',
      });
    }

    // const rowCount = await sequelizeMSQL.query(
    //   `SELECT COUNT(*) AS row FROM m_Item_Manufacturing_Supplier_template WHERE ISNULL(item_Periode, '') = '' AND Item_ID = :item_ID`,
    //   {
    //     replacements: { item_ID: item_ID },
    //     type: Sequelize.QueryTypes.SELECT,
    //   }
    // );

    const itemType = await sequelizeMSQL.query(`SELECT Item_Type FROM m_item_manufacturing_template WHERE Item_ID = :item_ID`, {
      replacements: { item_ID: item_ID },
      type: Sequelize.QueryTypes.SELECT,
    });

    let strSQL = '';

    if (itemType[0].Item_Type === 'BK') {
      strSQL += `
        DELETE FROM m_Item_Manufacturing_revisionDelete
        WHERE Item_ID = :item_ID AND Item_PrcID = :prc_ID AND Item_SuppID = :supp_ID;

        INSERT INTO m_Item_Manufacturing_revisionDelete
        SELECT Item_ID, Item_PrcID, Item_SuppID, Item_Revision, GETDATE(), :user_id, :delegated_to
        FROM m_item_manufacturing_supplier
        WHERE Item_ID = :item_ID AND Item_PrcID = :prc_ID AND Item_SuppID = :supp_ID;
      `;
    }

    strSQL += `
      DELETE FROM m_Item_Manufacturing_Supplier_template
      WHERE ISNULL(item_Periode, '') = '' AND Item_ID = :item_ID AND Item_PrcID = :prc_ID AND Item_SuppID = :supp_ID;
    `;

    await sequelizeMSQL.query(strSQL, {
      replacements: {
        item_ID: item_ID,
        prc_ID: prc_ID,
        supp_ID: supp_ID,
        user_id: user_id,
        delegated_to: delegated_to,
      },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      message: 'Data berhasil dihapus!',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting item:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan. Silakan coba lagi.',
    });
  }
}

async function getItemSupplier_template(req, res, next) {
  try {
    const { item_ID } = req.query;

    if (!item_ID) {
      return res.status(400).json({
        message: 'Item_ID is required.',
      });
    }

    const itemDetails = await getItemDetails(item_ID);

    if (!itemDetails || itemDetails.length === 0) {
      return res.status(404).json({
        message: 'Item not found.',
      });
    }

    const response = itemDetails.map((item) => ({
      Item_ID: item.Item_ID,
      Item_Name: item.Item_Name,
      Item_BPOMgenerik: item.item_bpomgenerik,
      Item_Generikname: item.Item_generikname,
      Item_PrcID: item.Item_PrcID,
      Prc_Name: item.Prc_Name,
      Item_BPOMNegara: item.Item_BPOMNegara,
      Country_Name: item.Country_Name,
      Supp_ID: item.Supp_ID,
      Supp_Name: item.Supp_Name,
      IsActive: item.IsActive,
      IsDefault: item.IsDefault ? 'True' : 'False',
      Item_Revision: item.Item_Revision || '00',
      Input_Date: item.input_date,
      IsHalal: item.isHalal,
      Lembaga: item.Lembaga,
      Nomor_Sertifikat: item.Nomor_sertifikat,
      Masa_Berlaku_Date: item.Masa_berlaku_date,
      Dok_Pendukung: item.Dok_Pendukung,
    }));

    return res.status(200).json({
      message: 'OK',
      data: response,
    });
  } catch (error) {
    console.error('Error in getItemSupplier_template:', error);
    return res.status(500).json({
      message: 'ERROR',
      data: error?.message || 'Internal Server Error',
    });
  }
}

async function getHistorySupplier_template(req, res) {
  try {
    const { item_ID } = req.query;

    if (!item_ID) {
      return res.status(400).json({ message: 'Item_ID is required.' });
    }

    const query = `
      SELECT DISTINCT
        b.emp_name AS UserID,
        c.emp_name AS DelegatedTo,
        CONVERT(nvarchar(17), a.deleteDate, 113) AS deleteDate,
        a.Status,
        CONVERT(nvarchar(10), a.deleteDate, 112) + REPLACE(CONVERT(nvarchar(9), a.deleteDate, 114), ':', '') AS orderby
      FROM (
        SELECT User_ID, Delegated_To, deleteDate, Status
        FROM m_Item_Manufacturing_History
        WHERE Item_ID LIKE :item_ID
        UNION ALL
        SELECT User_ID, Delegated_To, process_date AS deleteDate, 'LIVE' AS Status
        FROM m_Item_Manufacturing
        WHERE Item_ID LIKE :item_ID
      ) a
      LEFT JOIN m_Employee b ON a.User_ID = b.Emp_nik
      LEFT JOIN m_Employee c ON a.Delegated_To = c.Emp_nik
      ORDER BY orderby
    `;

    const historyData = await sequelizeMSQL.query(query, {
      replacements: { item_ID: item_ID },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (historyData.length === 0) {
      return res.status(404).json({ message: 'Data Not Found!' });
    }

    return res.status(200).json({ message: 'OK', data: historyData });
  } catch (error) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function checkPeriodController(req, res) {
  try {
    const { item_groupID } = req.query;

    if (!item_groupID) {
      return res.status(400).json({ message: 'TxtGroup_ID is required.' });
    }

    const result = await checkPeriod(item_groupID);

    return res.status(200).json({
      message: 'Period check completed.',
      data: result,
    });
  } catch (error) {
    console.error('Error in checkPeriodController:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function checkPeriod(TxtGroup_ID) {
  try {
    const [result] = await sequelizeMSQL.query(
      `SELECT COUNT(*) AS jum, MAX(item_Periode) AS MaxPeriode
       FROM m_Item_Manufacturing_template
       WHERE Item_Group = :TxtGroup_ID`,
      {
        replacements: { TxtGroup_ID },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (result.jum === 0) {
      const [maxPeriodeResult] = await sequelizeMSQL.query(
        `SELECT MAX(item_Periode) AS MaxPeriode
         FROM m_Item_Manufacturing_template
         WHERE Item_Group = :TxtGroup_ID`,
        {
          replacements: { TxtGroup_ID },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      return {
        exists: false,
        maxPeriode: maxPeriodeResult.MaxPeriode,
      };
    } else {
      return {
        exists: true,
        maxPeriode: result.MaxPeriode,
      };
    }
  } catch (error) {
    console.error('Error checking period:', error);
    throw error;
  }
}

const getItemDetails = async (item_ID) => {
  try {
    const query = `
      SELECT
        A.Item_ID,
        B.Item_Name,
        B.item_bpomgenerik,
        F.Item_Name AS Item_generikname,
        A.Item_PrcID,
        C.Prc_Name,
        A.Item_BPOMNegara,
        E.Country_Name,
        D.Supp_ID,
        D.Supp_Name,
        A.IsActive,
        A.IsDefault,
        A.Item_Revision,
        CONVERT(VARCHAR(10), A.input_date, 111) AS input_date,
        CASE WHEN ISNULL(A.item_ishalal, 0) = 0 THEN 'Non Halal' ELSE 'Halal' END AS isHalal,
        A.Lembaga,
        A.Nomor_sertifikat,
        A.Masa_berlaku_date,
        A.Dok_Pendukung
      FROM m_Item_Manufacturing_Supplier_template AS A
      LEFT JOIN m_Item_Manufacturing_template AS B ON B.Item_ID = A.Item_ID
      LEFT JOIN (
        SELECT *
        FROM m_Principle_template
        WHERE isactive = 1
          AND prc_id IN (SELECT ISNULL(prc_id, '') FROM T_QA_UA_M_Vendor UNION ALL SELECT '00029' AS prc_ID)
      ) AS C ON C.Prc_ID = A.ITem_PrcID
      LEFT JOIN (
        SELECT *
        FROM m_Supplier_template
        WHERE isActive = 1
          AND supp_id IN (SELECT ISNULL(supp_id, '') FROM T_QA_UA_M_Vendor UNION ALL SELECT '00307' AS supp_id)
      ) AS D ON D.Supp_ID = A.Item_SuppID
      LEFT JOIN (
        SELECT *
        FROM m_BPOM_Region
        WHERE isActive = 1
      ) AS E ON E.Country_ID = A.Item_BPOMNegara
      LEFT JOIN (
        SELECT *
        FROM m_BPOM_item
        WHERE isActive = 1
      ) AS F ON F.Item_ID = B.Item_BPOMGenerik
      WHERE ISNULL(A.item_Periode, '') = ''
        AND ISNULL(B.item_Periode, '') = ''
        AND A.Item_ID = :item_ID
        AND A.isactive = 1
        AND B.isActive = 1
        AND C.isActive = 1
    `;

    const result = await sequelizeMSQL.query(query, {
      replacements: { item_ID },
      type: Sequelize.QueryTypes.SELECT,
    });

    return result;
  } catch (error) {
    console.error('Error fetching item details:', error);
    return null;
  }
};

const getPrinciple = async (item_ID) => {
  try {
    const query = `
    SELECT TOP 1 item_type from m_item_manufacturing_template WHERE ISNULL(item_periode, '') = '' and item_type = 'BK' and item_ID = '${item_ID}' and ISNUMERIC(LEFT(item_ID, 1)) = 0
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { item_ID },
    });
    return result[0];
  } catch (error) {
    console.log({ error, name: 'getPrinciple' });
    return null;
  }
};

const getPrcById = async (prc_ID) => {
  try {
    const query = `
    SELECT TOP 1 * from m_principle where prc_ID = ${prc_ID} and isActive = 1;
    `;
    const result = await sequelizeMSQL.query(query, {
      replacements: { prc_ID },
    });
    return result[0][0];
  } catch (error) {
    console.log({ error, name: 'getPrcById' });
    return null;
  }
};

const getRevisi = async (item_ID, prc_ID) => {
  try {
    const query = `
      SELECT TOP 1
        item_revision,
        CONVERT(CHAR(23), CONVERT(DATETIME, item_revisionDate, 101), 121) as item_RevisionDate,
        Item_revisionUserId,
        item_ket,
        item_revisionDelegatedTo
      FROM m_item_manufacturing_supplier_template
      WHERE ISNULL(item_periode, '') = ''
        AND item_ID = :item
        AND item_PrcID = :prc
      ORDER BY Item_RevisionDate DESC
    `;

    const result = await sequelizeMSQL.query(query, {
      replacements: { item: item_ID, prc: prc_ID },
      type: sequelizeMSQL.QueryTypes.SELECT,
    });

    return result[0];
  } catch (error) {
    console.error({
      error,
      name: 'getRevisi',
    });
    return null;
  }
};

const getRevisionsDA = async (req, res) => {
  try {
    const { item_group } = req.query;

    if (!item_group) {
      return res.status(400).json({ message: 'Item group is required.' });
    }

    const query = `
      SELECT
        PK_ID,
        Item_Group,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        dokumen_terkait,
        refrensi,
        Process_Date
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group
      ORDER BY no_revisi DESC
    `;

    const revisions = await sequelizeMSQL.query(query, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (revisions.length === 0) {
      return res.status(404).json({ message: 'No revisions found for the given item group.' });
    }

    // Parse daftar_distribusi and dokumen_terkait if they are JSON strings
    const parsedRevisions = revisions.map(rev => ({
      ...rev,
      daftar_distribusi: (() => {
        try {
          return rev.daftar_distribusi ? JSON.parse(rev.daftar_distribusi) : null;
        } catch {
          return rev.daftar_distribusi;
        }
      })(),
      dokumen_terkait: (() => {
        try {
          return rev.dokumen_terkait ? JSON.parse(rev.dokumen_terkait) : rev.dokumen_terkait;
        } catch {
          return rev.dokumen_terkait;
        }
      })(),
      refrensi: (() => {
        try {
          if (!rev.refrensi) return rev.refrensi;
          const parsed = typeof rev.refrensi === 'string' ? JSON.parse(rev.refrensi) : rev.refrensi;
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return Array.isArray(rev.refrensi) ? rev.refrensi : [rev.refrensi];
        }
      })(),
    }));

    return res.status(200).json({ message: 'Revisions fetched successfully.', data: parsedRevisions });
  } catch (error) {
    console.error('Error fetching revisions:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const createRevision = async (req, res) => {
  try {
    const {
      item_group,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi = null,
      dokumen_terkait = null,
      refrensi = null,
      appr_userid = null,
      appr_delegated = null,
      appr_date = null,
      mgr_userid = null
    } = req.body;

    if (!item_group || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const [pkidResult] = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_item_manufacturing_revisions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const PK_ID = pkidResult.PK_ID;

    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;

    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group
      ORDER BY no_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    const new_no_revisi = latestRevision ? parseInt(latestRevision.no_revisi, 10) + 1 : 1;

    const query = `
      INSERT INTO m_item_manufacturing_revisions (
        PK_ID,
        Item_Group,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        dokumen_terkait,
        refrensi,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        mgr_userid
      )
      VALUES (
        :PK_ID,
        :item_group,
        :new_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        :daftar_distribusi,
        :dokumen_terkait,
        :refrensi,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :mgr_userid
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        PK_ID,
        item_group,
        new_no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        dokumen_terkait: stringDokumenTerkait,
        refrensi: stringRefrensi,
        appr_userid,
        appr_delegated,
        appr_date,
        mgr_userid
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Revision created successfully.' });
  } catch (error) {
    console.error('Error creating revision:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const updateItemManufacturingRevision = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const {
      PK_ID,
      Item_Group,
      no_revisi,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi,
      dokumen_terkait,
      refrensi,
      Process_Date,
      appr_userid,
      appr_delegated,
      appr_date,
      mgr_userid
    } = req.body;

    if (!PK_ID) {
      return res.status(400).json({ message: 'PK_ID is required.' });
    }

    // Build SET clause dynamically for all fields except PK_ID
    const fieldsToUpdate = {
      Item_Group,
      no_revisi,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi,
      dokumen_terkait,
      refrensi,
      Process_Date,
      appr_userid,
      appr_delegated,
      appr_date,
      mgr_userid
    };

    const setClause = Object.entries(fieldsToUpdate)
      .filter(([_, value]) => typeof value !== 'undefined')
      .map(([key, value]) => {
        if (value === null) return `${key} = NULL`;
        if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
        if (value instanceof Date) return `${key} = '${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
        return `${key} = ${value}`;
      })
      .join(', ');

    const query = `
      UPDATE m_item_manufacturing_revisions
      SET ${setClause}
      WHERE PK_ID = :PK_ID
    `;

    await sequelizeMSQL.query(query, {
      replacements: { PK_ID },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Revision updated successfully.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating revision:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

const createRevisionWithSameNumber = async (req, res) => {
  try {
    const {
      item_group,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi = null,
      dokumen_terkait = null,
      refrensi = null,
      appr_userid = null,
      appr_delegated = null,
      appr_date = null,
      mgr_userid = null
    } = req.body;

    if (!item_group || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;

    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group
      ORDER BY tgl_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!latestRevision) {
      return res.status(404).json({ message: 'No revisions found for the given item group.' });
    }

    const same_no_revisi = parseInt(latestRevision.no_revisi, 10);

    const [pkidResult] = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_item_manufacturing_revisions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const PK_ID = pkidResult.PK_ID;

    const query = `
      INSERT INTO m_item_manufacturing_revisions (
        PK_ID,
        Item_Group,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        dokumen_terkait,
        refrensi,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        mgr_userid
      )
      VALUES (
        :PK_ID,
        :item_group,
        :same_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        :daftar_distribusi,
        :dokumen_terkait,
        :refrensi,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :mgr_userid
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        PK_ID,
        item_group,
        same_no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        dokumen_terkait: stringDokumenTerkait,
        refrensi: stringRefrensi,
        appr_userid,
        appr_delegated,
        appr_date,
        mgr_userid
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Revision created successfully with the same revision number.' });
  } catch (error) {
    console.error('Error creating revision with the same number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getLatestRevisionNumber = async (req, res) => {
  try {
    const { item_group } = req.query;

    if (!item_group) {
      return res.status(400).json({ message: 'Item group is required.' });
    }

    // Query to fetch the latest revision number where `appr_date` is null
    const query = `
      SELECT TOP 1 *
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group AND appr_date IS NULL
      ORDER BY no_revisi DESC
    `;

    const [result] = await sequelizeMSQL.query(query, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Fetch all alasan_desc for this Item_Group
    const alasanQuery = `
      SELECT no_revisi, alasan_desc
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group
      ORDER BY no_revisi ASC
    `;
    const alasanList = await sequelizeMSQL.query(alasanQuery, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    // If no result is found, fallback to fetch the latest revision number
    if (!result) {
      const fallbackQuery = `
        SELECT TOP 1 *
        FROM m_item_manufacturing_revisions
        WHERE Item_Group = :item_group
        ORDER BY no_revisi DESC
      `;

      const [fallbackResult] = await sequelizeMSQL.query(fallbackQuery, {
        replacements: { item_group },
        type: Sequelize.QueryTypes.SELECT,
      });

      // If no fallback result is found, return 1 as the first revision number
      if (!fallbackResult) {
        return res.status(200).json({ no_revisi: 1, alasan_desc_list: alasanList });
      }

      // Increment the fallback result by 1
      const newRevision = parseInt(fallbackResult.no_revisi, 10) + 1;
      return res.status(200).json({ no_revisi: newRevision, alasan_desc_list: alasanList });
    }

    // Parse daftar_distribusi, dokumen_terkait, refrensi if they are JSON strings
    const parsedResult = {
      ...result,
      daftar_distribusi: (() => {
        try {
          return result.daftar_distribusi ? JSON.parse(result.daftar_distribusi) : null;
        } catch {
          return result.daftar_distribusi;
        }
      })(),
      dokumen_terkait: (() => {
        try {
          return result.dokumen_terkait ? JSON.parse(result.dokumen_terkait) : result.dokumen_terkait;
        } catch {
          return result.dokumen_terkait;
        }
      })(),
      refrensi: (() => {
        try {
          return result.refrensi ? JSON.parse(result.refrensi) : result.refrensi;
        } catch {
          return result.refrensi;
        }
      })(),
      alasan_desc_list: alasanList
    };

    // Return the latest revision number from the first query
    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error('Error fetching latest revision number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const approveRevisionByItemGroup = async (item_group, user_id, delegated_to, mgr_userid = null) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    if (!item_group || !user_id || !delegated_to) {
      throw new Error('item_group, user_id, and delegated_to are required.');
    }

    const sqlDtTime = moment().format('YYYY-MM-DD HH:mm:ss');

    // Check if the user is an approver
    const approver = await sequelizeMSQL.query(
      `SELECT TOP 1 Appr_Identity FROM m_Approver_Lines WHERE isactive = 1 AND Appr_ApplicationCode LIKE 'ITEM' AND Appr_ID LIKE :user_id`,
      { replacements: { user_id }, type: QueryTypes.SELECT }
    );

    if (!approver || approver.length === 0) {
      throw new Error('User is not authorized to approve.');
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || '0000';

    if (!sqlAppr_Identity || sqlAppr_Identity === '0000') return 0; // Approval failed

    const updateQuery = `
      UPDATE m_item_manufacturing_revisions
      SET appr_userid = :user_id,
          appr_delegated = :delegated_to,
          appr_date = :sqlDtTime,
          mgr_userid = :mgr_userid
      WHERE Item_Group = :item_group
        AND appr_date IS NULL;
    `;

    const [updateResult] = await sequelizeMSQL.query(updateQuery, {
      replacements: { user_id, delegated_to, sqlDtTime, item_group, mgr_userid },
      transaction,
    });

    // Commit the transaction if the update was successful
    if (updateResult > 0) {
      await transaction.commit();
      return 1; // Approval successful
    } else {
      throw new Error('No revisions found to approve.');
    }
  } catch (error) {
    console.error('Error approving revision:', error);
    await transaction.rollback();
    return 0; // Approval failed
  }
};

const updateOrCreateRevision = async (req, res) => {
  const {
    item_group,
    no_revisi,
    tgl_revisi,
    alasan_desc,
    daftar_distribusi = null,
    dokumen_terkait = null,
    refrensi = null,
    appr_userid = null,
    appr_delegated = null,
    appr_date = null,
    mgr_userid = null
  } = req.body;
  const { user_id, delegated_to } = req.user;

  if (!user_id || user_id === '' || !delegated_to || delegated_to === '') {
    return res.status(401).send('Unauthorized request');
  }

  if (!item_group || !no_revisi || !tgl_revisi || !alasan_desc) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const cutoffDate = new Date('2025-02-25');
  const inputDate = new Date(tgl_revisi);

  if (inputDate < cutoffDate) {
    return res.status(400).json({ message: "tgl_revisi cannot be earlier than 25th February 2025." });
  }
  const transaction = await sequelizeMSQL.transaction();
  try {
    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;

    const queryCheck = `
      SELECT TOP 1 PK_ID
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group AND no_revisi = :no_revisi
    `;

    const [existingRecord] = await sequelizeMSQL.query(queryCheck, {
      replacements: { item_group, no_revisi },
      type: QueryTypes.SELECT,
    });

    if (existingRecord) {

      const queryUpdate = `
        UPDATE m_item_manufacturing_revisions
        SET alasan_desc = :alasan_desc,
            tgl_revisi = :tgl_revisi,
            daftar_distribusi = :daftar_distribusi,
            dokumen_terkait = :dokumen_terkait,
            refrensi = :refrensi,
            appr_userid = :appr_userid,
            appr_delegated = :appr_delegated,
            appr_date = :appr_date,
            mgr_userid = :mgr_userid
        WHERE no_revisi = :no_revisi AND Item_Group = :item_group
      `;

      await sequelizeMSQL.query(queryUpdate, {
        replacements: {
          no_revisi,
          tgl_revisi,
          alasan_desc,
          item_group,
          daftar_distribusi: stringDaftarDistribusi,
          dokumen_terkait: stringDokumenTerkait,
          refrensi: stringRefrensi,
          appr_userid,
          appr_delegated,
          appr_date,
          mgr_userid
        },
        transaction,
      });

      await transaction.commit();
      return res.status(200).json({ message: "Revision updated successfully." });
    } else {

      const [pkidResult] = await sequelizeMSQL.query(
        `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_item_manufacturing_revisions`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      const PK_ID = pkidResult.PK_ID;

      const queryInsert = `
        INSERT INTO m_item_manufacturing_revisions (
          PK_ID,
          Item_Group,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          daftar_distribusi,
          dokumen_terkait,
          refrensi,
          Process_Date,
          appr_userid,
          appr_delegated,
          appr_date,
          mgr_userid
        )
        VALUES (
          :PK_ID,
          :item_group,
          :no_revisi,
          :tgl_revisi,
          :alasan_desc,
          :daftar_distribusi,
          :dokumen_terkait,
          :refrensi,
          GETDATE(),
          :appr_userid,
          :appr_delegated,
          :appr_date,
          :mgr_userid
        )
      `;

      await sequelizeMSQL.query(queryInsert, {
        replacements: {
          PK_ID,
          item_group,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          daftar_distribusi: stringDaftarDistribusi,
          dokumen_terkait: stringDokumenTerkait,
          refrensi: stringRefrensi,
          appr_userid,
          appr_delegated,
          appr_date,
          mgr_userid
        },
        transaction,
      });

      await transaction.commit();
      return res.status(201).json({ message: "Revision created successfully." });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateOrCreateRevision:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

async function getViewDPBATemplate(req, res, next) {
  try {
    let { item_group, page = 0, size = 10 } = req.query;

    const { limit, offset } = getPagination(parseInt(page), parseInt(size));

    if (!item_group || item_group === '') return res.status(500).json({ message: 'item_group is required' });

    let queryString = '';
    let countString = '';
    if (item_group === 'ä' || item_group === 'RH') {
      queryString = `
        SELECT
          v.*,
          s.Lembaga,
          s.Nomor_sertifikat,
          s.Masa_berlaku_date,
          s.Dok_Pendukung,
          c.nama_indo,
          ROW_NUMBER() OVER (ORDER BY v.KODE) AS RowNum
        FROM v_DPBA_template v
        LEFT JOIN m_Item_Manufacturing_template t ON v.KODE = t.Item_ID AND ISNULL(t.item_Periode,'') = ''
        LEFT JOIN m_Item_Manufacturing_Supplier_template s ON v.KODE = s.Item_ID AND s.isActive = 1 AND ISNULL(s.item_Periode,'') = ''
        LEFT JOIN m_Convert_bulan c ON DATEPART(MM, s.Masa_berlaku_date) = c.bulan
        WHERE v.Item_group IN ('ä', 'RH')
      `;
      countString = `
        SELECT COUNT(*) AS count from v_DPBA_template
        WHERE Item_group in ('ä', 'RH')
      `;
    } else {
      queryString = `
        SELECT
          v.*,
          s.Lembaga,
          s.Nomor_sertifikat,
          s.Masa_berlaku_date,
          s.Dok_Pendukung,
          c.nama_indo,
          ROW_NUMBER() OVER (ORDER BY v.KODE) AS RowNum
        FROM v_DPBA_template v
        LEFT JOIN m_Item_Manufacturing_template t ON v.KODE = t.Item_ID AND ISNULL(t.item_Periode,'') = ''
        LEFT JOIN m_Item_Manufacturing_Supplier_template s ON v.KODE = s.Item_ID AND s.isActive = 1 AND ISNULL(s.item_Periode,'') = ''
        LEFT JOIN m_Convert_bulan c ON DATEPART(MM, s.Masa_berlaku_date) = c.bulan
        WHERE v.Item_group = :item_group
      `;
      countString = `
        SELECT COUNT(*) AS count from v_DPBA_template
        WHERE Item_group = :item_group
      `;
    }

    // Add pagination to the main query
    const paginatedQuery = `
      SELECT * FROM (
        ${queryString}
      ) AS Result
      WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit
      ORDER BY KODE ASC
    `;

    const result = await sequelizeMSQL.query(paginatedQuery, {
      replacements: { item_group, offset, limit },
    });

    const [total] = await sequelizeMSQL.query(countString, {
      replacements: { item_group, offset, limit },
    });

    // Process rows to fix NULL keterangan_halal with proper formatting
    const processedRows = result[0].map(row => {
      let keterangan_halal = row.keterangan_halal;

      // If keterangan_halal is null, construct it from available data
      if (keterangan_halal === null || keterangan_halal === '') {
        if (row.item_ishalal === true || row.item_ishalal === 1) {
          // Construct halal information following the original view logic
          const lembaga = row.Lembaga || '';
          const nomor_sertifikat = row.Nomor_sertifikat || '';
          const masa_berlaku_date = row.Masa_berlaku_date;
          const dok_pendukung = row.Dok_Pendukung || '';
          const nama_indo = row.nama_indo || '';

          if (lembaga === '' || lembaga === '-') {
            // Use dok_pendukung format
            keterangan_halal = dok_pendukung ? ` (${dok_pendukung})` : '';
          } else {
            // Use full format: lembaga, nomor_sertifikat, date
            let parts = [];

            if (lembaga) parts.push(lembaga);
            if (nomor_sertifikat) parts.push(nomor_sertifikat);

            // Format date if available
            if (masa_berlaku_date && nomor_sertifikat && nomor_sertifikat !== '' && nomor_sertifikat !== '-') {
              try {
                const date = new Date(masa_berlaku_date);
                if (!isNaN(date.getTime())) {
                  const day = date.getDate().toString();
                  const month = nama_indo || '';
                  const year = date.getFullYear().toString();

                  if (month) {
                    parts.push(`${day} ${month} ${year}`);
                  }
                }
              } catch (e) {
                console.log('Date formatting error:', e);
              }
            }

            keterangan_halal = parts.length > 0 ? `, ${parts.join(', ')}` : 'Halal';
          }

          // Clean up empty parentheses
          keterangan_halal = keterangan_halal.replace(/^\(\)$/, '');
        } else {
          keterangan_halal = ' ';
        }
      }

      return {
        ...row,
        keterangan_halal
      };
    });

    const data = {
      rows: processedRows,
      count: total[0]?.count,
    };

    // ... rest of your existing code for revisions, file mapping, etc.
    let no_revisi = 0;
    let alasan_desc = '';
    const response = getPagingData(data, page, limit);
    let file = '';
    switch (item_group) {
      case 'C':
        file = 'DA.RD.000010';
        break;
      case 'A':
        file = 'DA.RD.000011';
        no_revisi = '49';
        alasan_desc = `CA/0357/RD3/09/22 NCP Penambahan kode A 186.000.`;
        break;
      case 'AB':
        file = 'DA.RD.000012';
        break;
      case 'BA':
        file = 'DA.RD.000013';
        no_revisi = '41';
        break;
      case 'BB':
        file = 'DA.RD.000014';
        break;
      case 'B':
        file = 'DA.RD.000015';
        break;
      case 'BR':
        file = 'DA.RD.000016';
        break;
      case 'L':
        file = 'DA.RD.000017';
        break;
      case 'E':
        file = 'DA.RD.000018';
        break;
      case 'D':
        file = 'DA.RD.000019';
        break;
      case 'K':
        file = 'DA.RD.000020';
        break;
      case 'IN':
        file = 'DA.RD.000005';
        break;
      case 'PR':
        file = 'DA.RD.000008';
        break;
      case 'CO':
        file = 'DA.RD.000007';
        break;
      case 'FL':
        file = 'DA.RD.000006';
        break;
      case 'AC':
        file = 'DA.RD.000004';
        break;
      case '02A':
      case '02B':
        // file = "DA.RD.000021"; // Uncomment when ready
        break;
      default:
        file = 'DA.RD.000009';
    }

    const detailRevisi = `
        SELECT
            no_revisi,
            tgl_revisi AS tgl_berlaku,
            alasan_desc AS alasan_perubahan
        FROM
            m_item_manufacturing_revisions
        WHERE
            item_group = :item_group and appr_date is not null
        ORDER BY
            no_revisi DESC
    `;

    const [revisi] = await sequelizeMSQL.query(detailRevisi, {
      replacements: { item_group },
    });

    const alasanQuery = `
      SELECT no_revisi, alasan_desc, tgl_revisi
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_group
      ORDER BY no_revisi ASC
    `;
    const alasanList = await sequelizeMSQL.query(alasanQuery, {
      replacements: { item_group },
      type: Sequelize.QueryTypes.SELECT,
    });

    response['nomorDocument'] = file;
    response['revisi'] = revisi;
    response['alasan_desc_list'] = alasanList;

    return res.status(200).json(response);
  } catch (error) {
    console.log({ error });
    const resp = {
      message: 'ERROR',
    };
    console.log({ error, name: error?.name });
    return res.status(500).json(resp);
  }
}

const exportDPBAToExcel = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const { item_group } = req.query;

    if (!user_id || user_id === '') {
      return res.status(401).send('Unauthorized request!');
    }

    // SQL query from VB code - item_group is now optional
    let strTemp = `SELECT * FROM v_DPBA_for_excel`;

    // Add item_group filter only if provided
    if (item_group && item_group.trim() !== '') {
      strTemp += ` WHERE Item_group = :item_group`;
    }

    strTemp += ` ORDER BY Item_group, KODE`;

    // Execute query with conditional replacements
    const replacements = {};
    if (item_group && item_group.trim() !== '') {
      replacements.item_group = item_group;
    }

    const data = await sequelizeMSQL.query(strTemp, {
      type: QueryTypes.SELECT,
      replacements
    });

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: 'No data found for the specified criteria'
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DPBA Report');

    // Get column headers from the first row
    const headers = Object.keys(data[0]);

    // Add headers to worksheet
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    data.forEach(row => {
      const rowValues = headers.map(header => row[header]);
      worksheet.addRow(rowValues);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const itemGroupPart = item_group && item_group.trim() !== '' ? `_${item_group}` : '_All';
    const filename = `DPBA_Report${itemGroupPart}_${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the Excel file
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('DPBA Excel export error:', error);
    next(error);
  }
};

async function getViewDPBA(req, res, next) {
  try {
    let { item_group, page = 0, size = 10 } = req.query;

    const { limit, offset } = getPagination(parseInt(page), parseInt(size));

    if (!item_group || item_group === '') return res.status(500).json({ message: 'item_group is required' });

    let queryString = '';
    let countString = '';
    if (item_group === 'ä' || item_group === 'RH') {
      queryString = `
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY KODE) AS RowNum
          FROM v_DPBA
          WHERE Item_group in ('ä', 'RH')
        ) AS Result
        WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit ORDER BY KODE ASC
      `;
      countString = `
        SELECT COUNT(*) AS count from v_DPBA
        WHERE Item_group in ('ä', 'RH')
      `;
    } else {
      queryString = `
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY KODE) AS RowNum
          FROM v_DPBA
          WHERE Item_group = :item_group
        ) AS Result
        WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit ORDER BY KODE ASC
      `;
      countString = `
        SELECT COUNT(*) AS count from v_DPBA
        WHERE Item_group = :item_group
      `;
    }

    const result = await sequelizeMSQL.query(queryString, {
      replacements: { item_group, offset, limit },
    });

    const [total] = await sequelizeMSQL.query(countString, {
      replacements: { item_group, offset, limit },
    });

    const data = {
      rows: result[0],
      count: total[0]?.count,
    };
    let no_revisi = 0;
    let alasan_desc = '';
    const response = getPagingData(data, page, limit);
    let file = '';
    switch (item_group) {
      case 'C':
        file = 'DA.RD.000010';
        break;
      case 'A':
        file = 'DA.RD.000011';
        no_revisi = '49';
        alasan_desc = `CA/0357/RD3/09/22 NCP Penambahan kode A 186.000.`;
        break;
      case 'AB':
        file = 'DA.RD.000012';
        break;
      case 'BA':
        file = 'DA.RD.000013';
        no_revisi = '41';
        break;
      case 'BB':
        file = 'DA.RD.000014';
        break;
      case 'B':
        file = 'DA.RD.000015';
        break;
      case 'BR':
        file = 'DA.RD.000016';
        break;
      case 'L':
        file = 'DA.RD.000017';
        no_revisi = '30';
        break;
      case 'E':
        file = 'DA.RD.000018';
        break;
      case 'D':
        file = 'DA.RD.000019';
        break;
      case 'K':
        file = 'DA.RD.000020';
        no_revisi = '61';
        break;
      case 'IN':
        file = 'DA.RD.000005';
        break;
      case 'PR':
        file = 'DA.RD.000008';
        no_revisi = '17';
        alasan_desc = `-	Update keterangan halal sesuai CG/0062/TH/10/24, CA/0069/PC/10/24, dan CG/0020/TH/11/24.`;
        break;
      case 'CO':
        file = 'DA.RD.000007';
        break;
      case 'FL':
        file = 'DA.RD.000006';
        no_revisi = '32';
        alasan_desc = `No CC : CA/0026/PG/02/25 FHG
        -	Perubahan pemasok pada kode FL 016A, FL 031, dan FL 032 ex. Givaudan dari PT Menjangan Sakti menjadi PT Unria Pratama Kencana.`;
        break;
      case 'AC':
        file = 'DA.RD.000004';
        break;
      case '02A':
      case '02B':
        // file = "DA.RD.000021"; // Uncomment when ready
        break;
      default:
        file = 'DA.RD.000009';
    }

    const detailRevisi = `
        SELECT
            no_revisi,
            tgl_revisi AS tgl_berlaku,
            alasan_desc AS alasan_perubahan
        FROM
            m_item_manufacturing_revisions
        WHERE
            item_group = :item_group and appr_date is not null
        ORDER BY
            no_revisi DESC
    `;

    const [revisi] = await sequelizeMSQL.query(detailRevisi, {
      replacements: { item_group },
    });

    response['nomorDocument'] = file;
    response['revisi'] = revisi;

    return res.status(200).json(response);
  } catch (error) {
    console.log({ error });
    const resp = {
      message: 'ERROR',
    };
    console.log({ error, name: error?.name });
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
    `;
    const [data] = await sequelizeMSQL.query(queryString, {
      replacements: {
        item_ID: `${item_ID}`,
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', queryObject);
      },
    });

    console.log({ PPICount: data?.jum });

    return data?.jum;
  } catch (error) {
    console.log({ error });
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
    `;
    const data = await sequelizeMSQL.query(queryString, {
      replacements: {
        item_ID: `${item_ID}`,
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', queryObject);
      },
    });

    console.log(data);

    return data;
  } catch (error) {
    console.log({ error });
    return null;
  }
}

async function getItemIdByGroupId(item_group) {
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
    `;
    const [data] = await sequelizeMSQL.query(queryString, {
      replacement: {
        item_group_like: `${item_group}%`,
      },
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        console.log('Executing query:', query);
      },
    });

    console.log({ data: data[''] });

    return data[''];
  } catch (error) {
    console.log({ error });
    return null;
  }
}

async function getPKID() {
  try {
    const queryString = `SELECT MAX(PK_ID) + 1 as PKID from m_item_Manufacturing_template where ISNULL(item_Periode,'') = '' `;

    const [data] = await sequelizeMSQL.query(queryString, {
      type: Sequelize.QueryTypes.SELECT,
      logging: (query, queryObject) => {
        // console.log('Executing query:', query);
      },
    });
    // console.log({data});
    if (data) return data?.PKID;

    return null;
  } catch (error) {
    console.log({ error });
    return null;
  }
}

const generateItemID = async (item_groupID, existing = false) => {
  if (!item_groupID) {
    throw new Error('Item group ID is required');
  }

  let lblItem_ID = '';

  console.log({ charAt: item_groupID.charAt(0) });
  if (!isNaN(item_groupID.charAt(0))) {
    console.log('QUERY1');
    const query1 = `
      SELECT RIGHT('00' + CAST(ISNULL(CAST(RIGHT(MAX(REPLACE(Item_ID, ' ', '')), 3) AS INT), 0) + 1 AS VARCHAR), 3) AS newItemID
      FROM m_Item_Manufacturing_template
      WHERE ISNUMERIC(LEFT(Item_ID, 1)) = 1
        AND REPLACE(Item_ID, ' ', '') LIKE '${item_groupID}___'
    `;

    const result = await sequelizeMSQL.query(query1, { type: QueryTypes.SELECT });
    console.log({ result });
    lblItem_ID = `${item_groupID} ${result.length > 0 ? result[0].newItemID : '001'}`;
  } else {
    console.log('QUERY2');
    const query2 = `
      SELECT '${item_groupID} ' + RIGHT('00' + CAST(CAST(ISNULL(SUBSTRING(MAX(Item_ID), CHARINDEX(' ', MAX(Item_ID)) + 1, 3), 0) AS INTEGER) + 1 AS VARCHAR), 3) AS newItemID
      FROM m_Item_Manufacturing_template
      WHERE Item_ID LIKE '${item_groupID} %'
    `;

    const result = await sequelizeMSQL.query(query2, { type: QueryTypes.SELECT });
    console.log({ result2: result });
    lblItem_ID = result.length > 0 ? result[0].newItemID : `${item_groupID} 001`;
    if (item_groupID !== 'RH') {
      lblItem_ID = lblItem_ID + '.000';
    }
  }

  return lblItem_ID;
};

function getBase64Image(filePath) {
  const image = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${image.toString('base64')}`;
}

async function printTest(req, res) {
  const { link, type, kode = '-', revisi = '-', judul = '-', tanggal = '', token, template = 'old', berlaku, review, landscape = 0 } = req.query;

  let browser;
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logoBase64 = getBase64Image(logoPath);

    // await page.setExtraHTTPHeaders({
    //   'authentication': token
    // });

    await page.goto(link, { waitUntil: 'networkidle0' });

    await page.addStyleTag({
      content: `
        * {
          font-size: ${landscape === 0 ? `12px` : `11px`} !important;
          font-family: Arial, sans-serif;
        }

        table {
          margin-top: ${landscape === 0 ? `12px` : `11px`} !important; /* Ensures margin applies to all tables */
        }
      `,
    });
       let headerTemplateNew = `
      <table style="width: ${landscape === 0 ? '90%' : '93%'}; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
 <tr>
          <td style="border: 1px solid gray; width: 140px; height: 120px; text-align: center;" rowspan="2">
            <img src="${logoBase64}" alt="lapilogo" width="100">
          </td>

          <td style="border: 1px solid gray; text-align: start; font-weight: bold; height: 12px; padding-left: 10px; width : 60%">
            DAFTAR
          </td>

          <td style="width: 220px; height: 120px; border: 1px solid gray; vertical-align: top;" rowspan="2">
            <div style="width: 100%; font-size: 12px; display: flex; flex-direction: column;">
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; padding-bottom: 8px; border-right: 1px solid gray;">
                  <span>Nomor</span>

                </div>
                <div style="width: 50%; padding: 5px;">${kode}
                </div>
              </div>
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Tanggal Berlaku</span>
                </div>
                <div style="width: 50%; padding: 5px;">
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
      </div>
              </div>
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Tanggal Review</span>
                </div>
              <div style="width: 50%; padding: 5px;">
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
      <div style="height: 12px;"></div>
    </div>
              </div>
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Revisi</span>
                </div>
                <div style="width: 50%; padding: 5px;">${revisi}</div>
              </div>
              <div style="display: flex; flex: 1;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Halaman</span>
                </div>
                <div style="width: 50%; padding: 5px;"><span class="pageNumber"></span> dari <span class="totalPages"></span></div>
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="border: 1px solid gray; height: 96px; text-align: center; font-weight: bold;">
            ${judul}
          </td>
        </tr>      </table>
      `;

      let headerTemplateOld = `
      <table style="width: 90%; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
        <tr>
          <td style="border: 1px solid gray; width: 140px; height: 100px; text-align: center;" rowspan="2">
            <img src="${logoBase64}" alt="lapilogo" width="100">
          </td>

          <td style="border: 1px solid gray;  text-align: start; font-weight: bold;  height:24px; padding-left: 10px">
            DAFTAR
          </td>

          <td style="width: 220px; height: 100px; border: 1px solid gray; vertical-align: top;" rowspan="2">
            <div style="width: 100%; height: 100px; font-size: 12px; display: flex; flex-direction: column;">
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Nomor</span>
                </div>
                <div style="width: 50%; padding: 5px;">${kode}</div>
              </div>
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Tanggal</span>
                </div>
                <div style="width: 50%; padding: 5px;">${tanggal}</div>
              </div>
              <div style="display: flex; flex: 1; border-bottom: 1px solid gray;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Revisi</span>
                </div>
                <div style="width: 50%; padding: 5px;">${revisi}</div>
              </div>
              <div style="display: flex; flex: 1;">
                <div style="width: 50%; padding: 5px; border-right: 1px solid gray;">
                  <span>Halaman</span>
                </div>
                <div style="width: 50%; padding: 5px;"><span class="pageNumber"></span> dari <span class="totalPages"></span></div>
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="border: 1px solid gray; height: 70px; text-align: center; font-weight: bold;">
            ${judul}
          </td>
        </tr>
      </table>
      `;
    // Membuat PDF dalam bentuk buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: ` `,
      headerTemplate: template === 'old' ? headerTemplateOld : headerTemplateNew,
      margin: { bottom: '60px', top: '235px', left: '40px', right: '40px' },
      landscape: landscape === 0 ? false : true,
    });

    await browser.close();
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error during printCatatanTrial:', error);
    if (browser) await browser.close();
    res.status(500).send({ error: 'An error occurred during PDF generation.' });
  }
}

async function printHeader(req, res) {
  const { link, noDoc, tanggal, revisi, title, sameNumber} = req.query;
  const landscape = Number(req.query.landscape || 1);


  let browser;
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logoBase64 = getBase64Image(logoPath);

    // await page.setExtraHTTPHeaders({
    //   'authentication': token
    // });

    await page.goto(link, { waitUntil: 'networkidle0' });

    await page.addStyleTag({
      content: `
        * {
          font-size: ${landscape === 0 ? `12px` : `9px`} !important;
 font-family: Verdana, sans-serif;        }

        table {
          margin-top: ${landscape === 0 ? `12px` : `9px`} !important; /* Ensures margin applies to all tables */
        }
      `,
    });
    let headerLandscape = `
<table style="width: ${landscape === 0 ? '90%' : '93%'}; margin: 0 auto; font-size: 11px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
  <tbody>
    <tr>
      <td style="border: 1px solid gray; width: 90px; height: 50px; text-align: center;" rowspan="2">
        <img src="${logoBase64}" alt="lapilogo" width="50">
      </td>
      <td style="border: 1px solid #6b7280;">
        <div style="font-size: 11px; padding-top: 0.1rem; padding-bottom: 0.1rem; text-align: center; display: flex; align-items: center; justify-content: center;">
          <h3 style="font-weight: bold; line-height: 1.1; margin: 0; font-size: 11px;">
            <span>${title || 'FORMULA PRODUK' }</span>
          </h3>
        </div>
      </td>
    </tr>
  </tbody>
</table>
      `;

      let footerLandscape =
      `
<table style="width: ${landscape === 0 ? '90%' : '93%'}; margin: 0 auto; font-size: 12px; border: 1px solid gray; border-collapse: collapse; font-family: Verdana, sans-serif;">
  <tr>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Nomor</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${noDoc}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Tanggal</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${tanggal}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Revisi</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${revisi}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Halaman</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">
      ${sameNumber ? `<span>1</span> dari <span>1</span>` : `<span class="pageNumber"></span> dari <span class="totalPages"></span>`}
    </td>
  </tr>
</table>
`

    // Membuat PDF dalam bentuk buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: footerLandscape,
      headerTemplate:headerLandscape,
      margin: { bottom: '60px', top: '80px', left: '40px', right: '40px' },
      landscape: landscape === 0 ? false : true,
    });

    await browser.close();
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error during printCatatanTrial:', error);
    if (browser) await browser.close();
    res.status(500).send({ error: 'An error occurred during PDF generation.' });
  }
}

async function cmdApprove(req, res, next) {
  const transaction = await sequelizeMSQL.transaction();
  const { user_id, delegated_to } = req.user;
  const { item_groupID } = req.body;

  if (!item_groupID || item_groupID === '') {
    return res.status(400).json({ message: 'Group KODE tidak boleh dikosongkan !!!' });
  }

  try {
    const [{ perio, GetNow: sqlDtTime }] = await sequelizeMSQL.query(
      `SELECT REPLACE(CONVERT(VARCHAR(19), GETDATE(), 121), '-', '') AS perio, CONVERT(VARCHAR, GETDATE(), 20) AS GetNow`,
      { type: QueryTypes.SELECT }
    );
    const sqlPeriode = perio;

    if (!user_id || user_id === '') {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!sqlPeriode || sqlPeriode === '') {
      return res.status(400).json({ message: 'Periode is required' });
    }

    if (!delegated_to || delegated_to === '') {
      delegated_to = user_id;
    }

    const approver = await sequelizeMSQL.query(
      `SELECT TOP 1 Appr_Identity FROM m_Approver_Lines WHERE isactive = 1 AND Appr_ApplicationCode LIKE 'ITEM' AND Appr_ID LIKE :user_id`,
      { replacements: { user_id }, type: QueryTypes.SELECT }
    );

    if (!approver || approver.length === 0) {
      return res.status(500).json({ message: 'Can not approve data, not authorized user' });
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || '0000';

    const xSQL1 = `
      UPDATE m_Item_Manufacturing_Supplier_template
      SET item_Periode = :sqlPeriode, tgl_berlaku = :sqlDtTime, user_approve = :user_id, user_delegated = :delegated_to
      WHERE ISNULL(item_Periode, '') = '' AND Item_ID IN (
        SELECT DISTINCT Item_ID FROM m_Item_Manufacturing_template WHERE ISNULL(item_Periode, '') = '' AND Item_Group = :item_groupID
      );

      UPDATE m_Item_Manufacturing_template
      SET item_Periode = :sqlPeriode, tgl_berlaku = :sqlDtTime, user_approve = :user_id, user_delegated = :delegated_to
      WHERE ISNULL(item_Periode, '') = '' AND Item_Group = :item_groupID;

      UPDATE m_Item_Manufacturing_Status
      SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete'
      WHERE Item_ID IN (SELECT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);

      DELETE FROM m_Item_Manufacturing_Status
      WHERE Item_ID IN (SELECT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);
    `;

    const xSQL2 = `
      INSERT INTO m_Item_Manufacturing_Status (Item_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To)
      SELECT Item_ID, 1, 0, :sqlAppr_Identity, :sqlDtTime, :user_id, :delegated_to
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode AND Item_Group = :item_groupID;
    `;

    const zSQL1 = `
      UPDATE m_Item_Manufacturing_Supplier
      SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete'
      WHERE Item_ID IN (SELECT DISTINCT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);

      DELETE FROM m_Item_Manufacturing_Supplier
      WHERE Item_ID IN (SELECT DISTINCT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);
    `;

    const zSQL2 = `
      INSERT INTO m_Item_Manufacturing_Supplier (
        Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
      )
      SELECT Item_ID, Item_PrcID, Item_SuppID, :sqlDtTime, :user_id, :delegated_to, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
      FROM m_Item_Manufacturing_Supplier_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;

    const zSQL3 = `
      INSERT INTO m_Item_Manufacturing_Supplier_template (
        Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung,
        item_Periode, tgl_berlaku, user_approve, user_delegated
      )
      SELECT Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID,
        item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung,
        NULL AS item_Periode, NULL AS tgl_berlaku, NULL AS user_approve, NULL AS user_delegated
      FROM m_Item_Manufacturing_Supplier_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;

    const vSQL1 = `
      UPDATE m_Item_Manufacturing
      SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete'
      WHERE Item_Group = :item_groupID;

      DELETE FROM m_Item_Manufacturing
      WHERE Item_Group = :item_groupID;
    `;

    const vSQL2 = `
      INSERT INTO m_Item_Manufacturing (
        PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
        Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
        User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
        Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
      )
      SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
        Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, 1 AS Item_Status, Item_BJ,
        :user_id, :delegated_to, :sqlDtTime, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
        Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;

    const vSQL3 = `
      INSERT INTO m_Item_Manufacturing_template (
        PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
        Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ,
        User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
        Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, item_Periode, tgl_berlaku, user_approve, user_delegated
      )
      SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,
        Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, 1 AS Item_Status, Item_BJ,
        User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR,
        Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, NULL AS item_Periode, NULL AS tgl_berlaku, NULL AS user_approve, NULL AS user_delegated
      FROM m_Item_Manufacturing_template
      WHERE ISNULL(item_Periode, '') = :sqlPeriode;
    `;

    const approveRevisionSQL = `
      UPDATE m_item_manufacturing_revisions
      SET appr_userid = :user_id,
        appr_delegated = :delegated_to,
        appr_date = :sqlDtTime
      WHERE Item_Group = :item_groupID
      AND appr_date IS NULL
      AND no_revisi = (
        SELECT TOP 1 no_revisi
        FROM m_item_manufacturing_revisions
        WHERE Item_Group = :item_groupID
        ORDER BY PK_ID DESC
      );`
    const checkApprovalSQL = `
      SELECT TOP 1 appr_date
      FROM m_item_manufacturing_revisions
      WHERE Item_Group = :item_groupID
      ORDER BY PK_ID DESC
    `;

    let rSQL = `${xSQL1} ${xSQL2} ${zSQL1} ${zSQL2} ${zSQL3} ${vSQL1} ${vSQL2} ${vSQL3}`;

    const [latestRevision] = await sequelizeMSQL.query(checkApprovalSQL, {
      replacements: { item_groupID },
      type: QueryTypes.SELECT,
    });

    console.log({latestRevision, approveddate: latestRevision?.appr_date});
    if (latestRevision && latestRevision.appr_date) {
      rSQL = `${xSQL1} ${xSQL2} ${zSQL1} ${zSQL2} ${zSQL3} ${vSQL1} ${vSQL2} ${vSQL3}`;
    } else {
      rSQL = `${xSQL1} ${xSQL2} ${zSQL1} ${zSQL2} ${zSQL3} ${vSQL1} ${vSQL2} ${vSQL3} ${approveRevisionSQL}`;
    }

    await sequelizeMSQL.query(rSQL, {
      replacements: {
        sqlPeriode,
        sqlDtTime,
        sqlAppr_Identity,
        user_id,
        delegated_to,
        item_groupID,
      },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Data has been approved for this period!' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const queryItemOther = async (itemType, groupId) => {
  try {
    // Validate inputs
    if (!itemType || !groupId) {
      throw new Error('Item type and group ID are required');
    }

    // Build the main query
    let sql = `
      SELECT
        Item_ID,
        Group_name,
        Item_Name,
        Item_Size,
        Item_Description,
        item_unit,
        item_group,
        item_type,
        item_Currency,
        Item_Price,
        Item_MinOrder,
        Item_LeadTime,
        item_PackingSize,
        Item_Localindent,
        Item_LastPriceCurrency,
        item_LastPrice,
        item_lastPriceDate,
        item_status,
        IsActive,
        '1' as SubCode
      FROM vwM_ItemWithGroup
      WHERE item_type LIKE :itemType
        AND item_isPPI = 1
        AND Item_Group = :groupId
    `;

    // Add union to include group ID with empty values
    sql += `
      UNION ALL
      SELECT
        :groupId + Group_ID,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        '0'
      FROM m_Item_Group
      WHERE Group_ID <> 'NN'
        AND ISNUMERIC(LEFT(Group_ID,1)) = 0
      ORDER BY 1
    `;

    // Execute query
    const results = await sequelizeMSQL.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        itemType: itemType,
        groupId: groupId
      }
    });

    return {
      success: true,
      data: results,
      columns: [
        "KODE", "MASTER", "NAMA BARANG", "UKURAN", "KETERANGAN", "SATUAN",
        "", "", "", "", "", "", "", "", "", "", "", "", "Is Active", "Sub Code"
      ]
    };
  } catch (error) {
    console.error('Error in queryItemOther:', error);
    return {
      success: false,
      message: error.message || 'Internal Server Error'
    };
  }
};

const queryGroupBahan = async (itemType) => {
  try {
    // Validate input
    if (!itemType) {
      throw new Error('Item type is required');
    }

    // Build the query
    const sql = `
      SELECT
        Group_ID,
        Group_Name
      FROM m_Item_Group
      WHERE Group_ID <> 'NN'
        AND ISNUMERIC(LEFT(Group_ID,1)) = 0
        AND group_type LIKE :itemType
      ORDER BY 1
    `;

    // Execute query
    const results = await sequelizeMSQL.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        itemType: itemType
      }
    });

    return {
      success: true,
      data: results,
      columns: ["KODE GROUP", "NAMA GROUP BAHAN"]
    };
  } catch (error) {
    console.error('Error in queryGroupBahan:', error);
    return {
      success: false,
      message: error.message || 'Internal Server Error'
    };
  }
};

const viewItemIsHalal = async (itemType, groupId) => {
  try {
    // Validate inputs
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    // Default strMsgBox value is 0 in the original code
    const strMsgBox = 0;
    let sql, columns;

    if (strMsgBox === 1) {
      // Path 1: Get halal items (specific filter)
      columns = [
        "KODE", "MASTER", "NAMA BARANG", "UKURAN", "KETERANGAN", "SATUAN",
        "", "", "", "", "", "", "", "", "", "", "", "", "Is Active", "Owner"
      ];

      sql = `
        SELECT
          Item_ID,
          Group_name,
          Item_Name,
          Item_Size,
          Item_Description,
          item_unit,
          item_group,
          item_type,
          item_Currency,
          Item_Price,
          Item_MinOrder,
          Item_LeadTime,
          item_PackingSize,
          Item_Localindent,
          Item_LastPriceCurrency,
          item_LastPrice,
          item_lastPriceDate,
          item_status,
          IsActive,
          Owner
        FROM vwM_ItemIsHalal
        WHERE isactive = 1
          AND Item_Group LIKE :groupId
          AND ISNULL(ishalal,'0') = '0'
        ORDER BY Item_ID
      `;
    } else {
      // Path 2: Get max item templates (default path)
      columns = ["Item Group", "Kode Item"];

      sql = `
        SELECT
          item_group,
          MAX(item_sub) as item_sub
        FROM vw_ItemMax_template
        WHERE item_group = :groupId
        GROUP BY item_group, item_main
        ORDER BY 2
      `;
    }

    // Execute query
    const results = await sequelizeMSQL.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        groupId: groupId
      }
    });

    if (results.length === 0) {
      return {
        success: false,
        message: "Data Not Found!"
      };
    }

    // For the second path (default), process results to get the last batch character
    if (strMsgBox !== 1) {
      const processedResults = await Promise.all(results.map(async (result) => {
        // Determine which function to use based on item type and group
        const fnName = (itemType === "BK" && groupId !== "RH")
          ? "fnGetItemLastChar_BK"
          : "fnGetItemLastChar";

        // Get the last batch character using the appropriate SQL function
        const query = `SELECT dbo.[${fnName}](:itemSub) as strLastBatch`;
        const [lastBatchResult] = await sequelizeMSQL.query(query, {
          type: QueryTypes.SELECT,
          replacements: {
            itemSub: result.item_sub
          }
        });

        // Calculate the extracted item ID (following the VB string manipulation logic)
        const strLastBatch = lastBatchResult?.strLastBatch || '';
        const intSTART = (result.item_group || '').length + 2;
        const intEND = (strLastBatch || '').length - (result.item_group || '').length - 1;

        return {
          ...result,
          strLastBatch,
          lblItem_ID: strLastBatch,
          txtItem_ID: strLastBatch.substring(intSTART, intEND)
        };
      }));

      return {
        success: true,
        data: processedResults,
        columns
      };
    }

    // For path 1, format the results differently
    const processedResults = results.map(item => {
      const intSTART = (item.item_group || '').length + 2;
      const intEND = (item.Item_ID || '').length - (item.item_group || '').length - 1;

      return {
        ...item,
        lblItem_ID: (item.Item_ID || '').substring(0, (item.Item_ID || '').length - 2),
        txtItem_ID: (item.Item_ID || '').substring(intSTART, intEND).substring(0, intEND - 2),
        txtItem_Name: item.Item_Name
      };
    });

    return {
      success: true,
      data: processedResults,
      columns
    };
  } catch (error) {
    console.error('Error in viewItemIsHalal:', error);
    return {
      success: false,
      message: error.message || 'Internal Server Error'
    };
  }
};

const getQueryController = async (req, res, next) => {
  try {
    const { groupId, itemType } = req.query;

    // Validate required parameters
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Harap Pilih Group Code"
      });
    }

    if (!itemType) {
      return res.status(400).json({
        success: false,
        message: "Item Type is required"
      });
    }

    // Determine which query to execute based on groupId format
    let result;

    if (!isNaN(parseInt(groupId.charAt(0)))) {
      // If first character is numeric, call queryItemOther
      result = await queryItemOther(itemType, groupId);
    } else {
      // If first character is not numeric, call viewItemIsHalal
      result = await viewItemIsHalal(itemType, groupId);
    }

    // Check if the query was successful
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || "Data Not Found!"
      });
    }

    // Return successful response with data
    return res.status(200).json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in getQueryController:', error);

    // Pass to Express error handler or handle directly
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {
  cmdApprove,
  printTest,
  checkPeriodController,
  getHistorySupplier_template,
  getItemSupplier_template,
  masterItemPrinciple_DELETE,
  masterItemPrinciple_UPDATE,
  masterItemPrinciple_CREATE,
  masterBahanAwalTemplate_CREATE,
  masterBahanAwalTemplate_UPDATE,
  masterBahanAwalTemplate_DELETE,
  masterBahanAwalTemplate_APPROVE,
  getViewDPBATemplate,
  getRevisionsDA,
  createRevision,
  getLatestRevisionNumber,
  createRevisionWithSameNumber,
  approveRevisionByItemGroup,
  updateOrCreateRevision,
  getViewDPBA,
  getManager,
  getQueryController,
  printHeader,
  updateItemManufacturingRevision,
  exportDPBAToExcel
};
