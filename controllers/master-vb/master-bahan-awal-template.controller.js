const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { getPagination, getPagingData } = require("../../helpers/pagination");
const { Sequelize } = require("../../models");

const { QueryTypes } = require("sequelize");

const masterBahanAwalTemplate_CREATE = async (req, res) => {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    try {
        const {
            item_ID,
            item_name,
            item_kodeGenerik,
            item_groupID,
            item_type,
            item_size,
            item_description,
            item_unit,
            item_minOrder = "",
            item_leadTime = "",
            item_packingSize = "",
            item_localIndent,
            strInput = "0",
            username = user_id,
            delegatedTo = delegated_to,
            owner,
            isHalal,
            row,
            itemStatus = "1",
        } = req.body;

        if (!user_id || user_id === "") return res.status(401).send("Unauthorized request!");
        let lblItem_ID = "";

        if (!item_groupID || !item_name) {
            return res.status(400).json({ message: "Nama Barang harus diisi dan tidak boleh kosong!!!" });
        }

        if (!item_unit) {
            return res.status(400).json({ message: "Satuan harus diisi!" });
        }

        lblItem_ID = await generateItemID(item_groupID);
        // if(item_type === "BK") lblItem_ID =  lblItem_ID + '.000';

        console.log({lblItem_ID});
        if (item_type === "BAHAN KEMAS") {
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
        const PK_ID = pkidResult ? pkidResult.PKID : 1;

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
                '${username}', '${delegatedTo}', GETDATE(), 1, '${owner}', '${isHalal}', '${row}', '${itemStatus}'
            )
        `;

        await sequelizeMSQL.query(insertQuery, { type: QueryTypes.INSERT });

        return res.status(201).json({ message: `Data berhasil disimpan dengan kode: ${lblItem_ID}` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Terjadi kesalahan saat menyimpan data.", error: error.message });
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
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { item_ID, insertRevisi = false, txtUkuranHistory = '', ...fieldsToUpdate } = req.body;

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


      if (insertRevisi && (txtUkuranHistory || txtUkuranHistory !== '' )) {
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
        console.log({query});
      },
      transaction
    });


    console.log({updatedData});
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
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
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
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  try {
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    const { TxtGroup_ID, gstrUserName = user_id, gstrDelegatedTo = delegated_to } = req.body;

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
      ukuranLama = ''
    } = req.body;

    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    console.log({user_id, delegated_to});
    if (!item_ID) throw new Error(`Item ID wajib diisi!`);

    if (!txtHalal || txtHalal === '') throw new Error(`Harap pilih Halal/Non Halal!`)

    if (!prc_ID || prc_ID === '') throw new Error(`Harap pilih principlenya`)

    const principleDetail = await getPrcById(prc_ID);

    console.log({principleDetail});

    let isHalal = 0;
    let stringSertifikat = ``

    if (txtHalal === 'Halal') {
      isHalal = 1;
      if (typeof lembagaHalal === 'undefined' || typeof nomorSertifikatHalal === 'undefined' || typeof halalExpDate === 'undefined') {
        stringSertifikat = '';
      } else {
        stringSertifikat = `${lembagaHalal}${nomorSertifikatHalal}${halalExpDate}`
      }
    }

    const cekItem = await getPrinciple(item_ID);
    const cekRevisi = await getRevisi(item_ID, prc_ID);

    let [item_revisionDate, item_revisionUserID, item_revisionDelegatedTo, item_revision, item_revisionKet] = ['', '', '', '', ''];

    if (!cekRevisi) {
      const getDateTime = new Date();
      item_revision = '00'
      item_revisionDate = getDateTime.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/');
      item_revisionUserID = user_id
      item_revisionDelegatedTo = delegated_to
      item_revisionKet =  ''
      statusRev = false
    }
    console.log({cekRevisi});
    if (cekRevisi) {
      item_revision = cekRevisi?.item_revision;
      item_revisionDate = cekRevisi?.item_revisionDate ? cekRevisi.item_revisionDate.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '/') : '';
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
    console.log({stringSertifikat});
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
      message: "OK",
    });

  } catch (error) {
    const resp = {
      message: "ERROR",
    }
    await transaction.rollback();
    console.log({error, name: error?.name});
    return res.status(500).json(resp);
  }
}

async function masterItemPrinciple_UPDATE(req, res) {
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  const transaction = await sequelizeMSQL.transaction();
  try {
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

    const { user_id } = req.user;

    if (!item_ID) {
      await transaction.rollback();
      return res.status(400).json({ message: "Item ID tidak boleh kosong" });
    }

    if (!txtHalal) {
      await transaction.rollback();
      return res.status(400).json({ message: "Harap pilih Halal/Non Halal!" });
    }

    let strIsHalal;
    let strSertifikat;

    if (txtHalal === "Halal") {
      strIsHalal = 1;
      strSertifikat = `
        , Lembaga=:lembagaHalal
        , Nomor_sertifikat=:nomorSertifikatHalal
        , Masa_berlaku_date=${txtHalalMasaBerlaku === "-" ? "NULL" : ":dtpHalalMasaBerlaku"}
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
        item_ID: item_ID.trim(),
        old_prc_ID: old_prc_ID.trim(),
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
        item_ID: item_ID.trim(),
        old_prc_ID: old_prc_ID.trim(),
        old_supp_ID: old_supp_ID.trim(),
      },
      transaction,
    });

    await transaction.commit();

    res.status(200).json({ message: "Data berhasil disimpan!" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating item:", error);
    res.status(500).json({ message: "Terjadi kesalahan. Silakan coba lagi." });
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
        message: "Item_ID, prc_ID, and supp_ID are required.",
      });
    }

    // const rowCount = await sequelizeMSQL.query(
    //   `SELECT COUNT(*) AS row FROM m_Item_Manufacturing_Supplier_template WHERE ISNULL(item_Periode, '') = '' AND Item_ID = :item_ID`,
    //   {
    //     replacements: { item_ID: item_ID.trim() },
    //     type: Sequelize.QueryTypes.SELECT,
    //   }
    // );

    const itemType = await sequelizeMSQL.query(
      `SELECT Item_Type FROM m_item_manufacturing_template WHERE Item_ID = :item_ID`,
      {
        replacements: { item_ID: item_ID.trim() },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    let strSQL = "";

    if (itemType[0].Item_Type === "BK") {
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
        item_ID: item_ID.trim(),
        prc_ID: prc_ID.trim(),
        supp_ID: supp_ID.trim(),
        user_id: req.user.gstrUserName,
        delegated_to: req.user.gstrDelegatedTo,
      },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      message: "Data berhasil dihapus!",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting item:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan. Silakan coba lagi.",
    });
  }
}

async function getItemSupplier_template(req, res, next) {
  try {
    const { item_ID } = req.query;

    if (!item_ID) {
      return res.status(400).json({
        message: "Item_ID is required.",
      });
    }

    const itemDetails = await getItemDetails(item_ID);

    if (!itemDetails || itemDetails.length === 0) {
      return res.status(404).json({
        message: "Item not found.",
      });
    }

    const response = itemDetails.map(item => ({
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
      IsDefault: item.IsDefault ? "True" : "False",
      Item_Revision: item.Item_Revision || "00",
      Input_Date: item.input_date,
      IsHalal: item.isHalal,
      Lembaga: item.Lembaga,
      Nomor_Sertifikat: item.Nomor_sertifikat,
      Masa_Berlaku_Date: item.Masa_berlaku_date,
      Dok_Pendukung: item.Dok_Pendukung,
    }));

    return res.status(200).json({
      message: "OK",
      data: response,
    });
  } catch (error) {
    console.error("Error in getItemSupplier_template:", error);
    return res.status(500).json({
      message: "ERROR",
      data: error?.message || "Internal Server Error",
    });
  }
}

async function getHistorySupplier_template(req, res) {
  try {
    const { item_ID } = req.query;

    if (!item_ID) {
      return res.status(400).json({ message: "Item_ID is required." });
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
      replacements: { item_ID: item_ID.trim() },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (historyData.length === 0) {
      return res.status(404).json({ message: "Data Not Found!" });
    }

    return res.status(200).json({ message: "OK", data: historyData });
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function checkPeriodController(req, res) {
  try {
    const { item_groupID } = req.query;

    if (!item_groupID) {
      return res.status(400).json({ message: "TxtGroup_ID is required." });
    }

    const result = await checkPeriod(item_groupID);

    return res.status(200).json({
      message: "Period check completed.",
      data: result,
    });
  } catch (error) {
    console.error("Error in checkPeriodController:", error);
    return res.status(500).json({ message: "Internal Server Error" });
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
    console.error("Error checking period:", error);
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
    console.error("Error fetching item details:", error);
    return null;
  }
};

const getPrinciple = async (item_ID) => {
  try {
    const query = `
    SELECT TOP 1 item_type from m_item_manufacturing_template WHERE ISNULL(item_periode, '') = '' and item_type = 'BK' and item_ID = '${item_ID}' and ISNUMERIC(LEFT(item_ID, 1)) = 0
    `
    const result = await sequelizeMSQL.query(query, {
      replacements: { item_ID },
    });
    return result[0];

  } catch (error) {
    console.log({error, name: 'getPrinciple'});
    return null;
  }
}

const getPrcById = async (prc_ID) => {
  try {
    const query = `
    SELECT TOP 1 * from m_principle where prc_ID = ${prc_ID} and isActive = 1;
    `
    const result = await sequelizeMSQL.query(query, {
      replacements: { prc_ID },
    });
    return result[0][0];

  } catch (error) {
    console.log({error, name: 'getPrcById'});
    return null;
  }
}

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
      name: 'getRevisi'
    });
    return null;
  }
};

async function getViewDPBATemplate(req, res, next) {
  try {
    let { item_group, page = 0, size = 10 } = req.query;

    const { limit, offset } = getPagination(parseInt(page), parseInt(size));

    if (!item_group || item_group === "") return res.status(500).json({message: 'item_group is required'})

    let queryString = ""
    let countString = ""
    if (item_group === "ä" || item_group === "RH") {
      queryString = `
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY NAMA) AS RowNum
          FROM v_DPBA_template
          WHERE Item_group in ('ä', 'RH')
        ) AS Result
        WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit ORDER BY NAMA ASC
      `
      countString = `
        SELECT COUNT(*) AS count from v_DPBA_template
        WHERE Item_group in ('ä', 'RH')
      `
    } else {
      queryString = `
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (ORDER BY NAMA) AS RowNum
          FROM v_DPBA_template
          WHERE Item_group = :item_group
        ) AS Result
        WHERE RowNum BETWEEN :offset + 1 AND :offset + :limit ORDER BY NAMA ASC
      `
      countString = `
        SELECT COUNT(*) AS count from v_DPBA_template
        WHERE Item_group = :item_group
      `
    }

    const result = await sequelizeMSQL.query(queryString, {
      replacements: { item_group, offset, limit },
    });

    const [total] = await sequelizeMSQL.query(countString, {
      replacements: { item_group, offset, limit },
    });

    const data = {
      rows: result[0],
      count: total[0]?.count
    }

    const response = getPagingData(data, page, limit);
    return res.status(200).json(response)

  } catch (error) {
    console.log({error});
    const resp = {
      message: "ERROR",
    }
    console.log({error, name: error?.name});
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

const generateItemID = async (item_groupID) => {
  if (!item_groupID) {
    throw new Error("Item group ID is required");
  }

  let lblItem_ID = "";

  if (!isNaN(item_groupID.charAt(0))) {
    console.log("QUERY1");
    const query1 = `
      SELECT RIGHT('00' + CAST(ISNULL(CAST(RIGHT(MAX(REPLACE(Item_ID, ' ', '')), 3) AS INT), 0) + 1 AS VARCHAR), 3) AS newItemID
      FROM m_Item_Manufacturing_template
      WHERE ISNUMERIC(LEFT(Item_ID, 1)) = 1
        AND REPLACE(Item_ID, ' ', '') LIKE '${item_groupID}___'
    `;

    const result = await sequelizeMSQL.query(query1, { type: QueryTypes.SELECT });
    console.log({result});
    lblItem_ID = `${item_groupID} ${result.length > 0 ? result[0].newItemID : "001"}`;
  } else {
    console.log('QUERY2');
    const query2 = `
      SELECT '${item_groupID} ' + RIGHT('00' + CAST(CAST(ISNULL(SUBSTRING(MAX(Item_ID), CHARINDEX(' ', MAX(Item_ID)) + 1, 3), 0) AS INTEGER) + 1 AS VARCHAR), 3) AS newItemID
      FROM m_Item_Manufacturing_template
      WHERE Item_ID LIKE '${item_groupID} %'
    `;

    const result = await sequelizeMSQL.query(query2, { type: QueryTypes.SELECT });
      lblItem_ID = result.length > 0 ? result[0].newItemID : `${item_groupID} 001`
    if (item_groupID !== "RH") {
      lblItem_ID = lblItem_ID + '.000'
    }
  }

  return lblItem_ID;
};


 module.exports = { checkPeriodController, getHistorySupplier_template, getItemSupplier_template, masterItemPrinciple_DELETE, masterItemPrinciple_UPDATE, masterItemPrinciple_CREATE, masterBahanAwalTemplate_CREATE, masterBahanAwalTemplate_UPDATE, masterBahanAwalTemplate_DELETE, masterBahanAwalTemplate_APPROVE, getViewDPBATemplate }