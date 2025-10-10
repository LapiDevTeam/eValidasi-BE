const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { QueryTypes, Sequelize } = require("sequelize");

// Helper for consistent step logging
function createStepLogger(context) {
  let step = 0;
  return (label, extra = {}) => {
    const msg = `[cmdApproveSeparate][${context}][step ${++step}] ${label}`;
    if (Object.keys(extra).length) {
      console.log(msg, extra);
    } else {
      console.log(msg);
    }
  };
}

async function cmdApproveSeparate(req, res, next) {
  let { user_id, delegated_to } = req.user || {};
  const { item_groupID } = req.body || {};

  // Early validations BEFORE opening a transaction (prevents leaking tx on early return)
  if (!item_groupID) {
    return res.status(400).json({ message: "Group KODE tidak boleh dikosongkan !!!" });
  }
  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }
  if (!delegated_to) delegated_to = user_id;

  try {
    // Get periode/time outside main mutation transaction (pure read)
    const [{ perio, GetNow: sqlDtTime }] = await sequelizeMSQL.query(
      `SELECT REPLACE(CONVERT(VARCHAR(19), GETDATE(), 121), '-', '') AS perio, CONVERT(VARCHAR, GETDATE(), 20) AS GetNow`,
      { type: QueryTypes.SELECT }
    );
    const sqlPeriode = perio;
    if (!sqlPeriode) {
      return res.status(400).json({ message: "Periode is required" });
    }

    // Authorization check (still outside write transaction)
    const approver = await sequelizeMSQL.query(
      `SELECT TOP 1 Appr_Identity FROM m_Approver_Lines WHERE isactive = 1 AND Appr_ApplicationCode = 'ITEM' AND Appr_ID = :user_id`,
      { replacements: { user_id }, type: QueryTypes.SELECT }
    );
    if (!approver || approver.length === 0) {
      return res.status(403).json({ message: "Cannot approve data, unauthorized user" });
    }
    const sqlAppr_Identity = approver[0]?.Appr_Identity || "0000";

    // Managed transaction pattern — Sequelize will auto rollback if an error escapes the callback
    await sequelizeMSQL.transaction({ isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async (t) => {
      const txId = t.id || Math.random().toString(36).slice(2, 10);
      const log = createStepLogger(txId);
      const capture = async (label, fn) => {
        log(label);
        try { return await fn(); } catch (err) { err._failedAt = label; throw err; }
      };

      // 1. Supplier Template
      await capture('Update Supplier Template', () => sequelizeMSQL.query(
        `UPDATE m_Item_Manufacturing_Supplier_template SET item_Periode = :sqlPeriode, tgl_berlaku = :sqlDtTime, user_approve = :user_id, user_delegated = :delegated_to WHERE ISNULL(item_Periode, '') = '' AND Item_ID IN (SELECT DISTINCT Item_ID FROM m_Item_Manufacturing_template WHERE ISNULL(item_Periode, '') = '' AND Item_Group = :item_groupID);`,
        { replacements: { sqlPeriode, sqlDtTime, user_id, delegated_to, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
      ));

      // 2. Manufacturing Template
      await capture('Update Manufacturing Template', () => sequelizeMSQL.query(
        `UPDATE m_Item_Manufacturing_template SET item_Periode = :sqlPeriode, tgl_berlaku = :sqlDtTime, user_approve = :user_id, user_delegated = :delegated_to WHERE ISNULL(item_Periode, '') = '' AND Item_Group = :item_groupID;`,
        { replacements: { sqlPeriode, sqlDtTime, user_id, delegated_to, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
      ));

      // 3. Manufacturing Status (mark + delete)
      await capture('Flag Manufacturing Status', () => sequelizeMSQL.query(
        `UPDATE m_Item_Manufacturing_Status SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete' WHERE Item_ID IN (SELECT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);`,
        { replacements: { user_id, delegated_to, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
      ));
      await capture('Delete Manufacturing Status', () => sequelizeMSQL.query(
        `DELETE FROM m_Item_Manufacturing_Status WHERE Item_ID IN (SELECT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);`,
        { replacements: { item_groupID }, type: QueryTypes.DELETE, transaction: t }
      ));

      // 4. Insert Manufacturing Status missing rows
      const candidateQuery = `SELECT Item_ID FROM m_Item_Manufacturing_template WHERE ISNULL(item_Periode, '') = :sqlPeriode AND Item_Group = :item_groupID AND NOT EXISTS (SELECT 1 FROM m_Item_Manufacturing_Status s WHERE s.Item_ID = m_Item_Manufacturing_template.Item_ID)`;
      const candidates = await capture('Select Status Candidates', () => sequelizeMSQL.query(candidateQuery, {
        replacements: { sqlPeriode, item_groupID },
        type: QueryTypes.SELECT,
        transaction: t,
      }));
      if (candidates.length > 0) {
        const itemIds = candidates.map(c => c.Item_ID);
        await capture('Insert Manufacturing Status', () => sequelizeMSQL.query(
          `INSERT INTO m_Item_Manufacturing_Status (Item_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To)
           SELECT DISTINCT Item_ID, 1, 0, :sqlAppr_Identity, :sqlDtTime, :user_id, :delegated_to FROM m_Item_Manufacturing_template WHERE Item_ID IN (:itemIds);`,
          { replacements: { sqlAppr_Identity, sqlDtTime, user_id, delegated_to, itemIds }, type: QueryTypes.INSERT, transaction: t }
        ));
      }

      // 5. Manufacturing Supplier (mark + delete + insert live)
      await capture('Flag Manufacturing Supplier', () => sequelizeMSQL.query(
        `UPDATE m_Item_Manufacturing_Supplier SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete' WHERE Item_ID IN (SELECT DISTINCT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);`,
        { replacements: { user_id, delegated_to, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
      ));
      await capture('Delete Manufacturing Supplier', () => sequelizeMSQL.query(
        `DELETE FROM m_Item_Manufacturing_Supplier WHERE Item_ID IN (SELECT DISTINCT Item_ID FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID);`,
        { replacements: { item_groupID }, type: QueryTypes.DELETE, transaction: t }
      ));
      await capture('Insert Manufacturing Supplier', () => sequelizeMSQL.query(
        `INSERT INTO m_Item_Manufacturing_Supplier (Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung)
         SELECT Item_ID, Item_PrcID, Item_SuppID, :sqlDtTime, :user_id, :delegated_to, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
         FROM m_Item_Manufacturing_Supplier_template WHERE ISNULL(item_Periode, '') = :sqlPeriode;`,
        { replacements: { sqlDtTime, user_id, delegated_to, sqlPeriode }, type: QueryTypes.INSERT, transaction: t }
      ));

      // 6. Re-clone Supplier Template rows for next cycle
      await capture('Reclone Supplier Template', () => sequelizeMSQL.query(
        `INSERT INTO m_Item_Manufacturing_Supplier_template (Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung, item_Periode, tgl_berlaku, user_approve, user_delegated)
         SELECT Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung,
                NULL AS item_Periode, NULL AS tgl_berlaku, NULL AS user_approve, NULL AS user_delegated
         FROM m_Item_Manufacturing_Supplier_template WHERE ISNULL(item_Periode, '') = :sqlPeriode;`,
        { replacements: { sqlPeriode }, type: QueryTypes.INSERT, transaction: t }
      ));

      // 7. Manufacturing (flag, delete, insert live)
      await capture('Flag Manufacturing', () => sequelizeMSQL.query(
        `UPDATE m_Item_Manufacturing SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete' WHERE Item_Group = :item_groupID;`,
        { replacements: { user_id, delegated_to, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
      ));
      await capture('Delete Manufacturing', () => sequelizeMSQL.query(
        `DELETE FROM m_Item_Manufacturing WHERE Item_Group = :item_groupID;`,
        { replacements: { item_groupID }, type: QueryTypes.DELETE, transaction: t }
      ));
      await capture('Insert Manufacturing', () => sequelizeMSQL.query(
        `INSERT INTO m_Item_Manufacturing (PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row)
         SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate,
                1 AS Item_Status, Item_BJ, :user_id, :delegated_to, :sqlDtTime, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
         FROM m_Item_Manufacturing_template WHERE ISNULL(item_Periode, '') = :sqlPeriode;`,
        { replacements: { user_id, delegated_to, sqlDtTime, sqlPeriode }, type: QueryTypes.INSERT, transaction: t }
      ));

      // 8. Re-clone Manufacturing Template
      await capture('Reclone Manufacturing Template', () => sequelizeMSQL.query(
        `INSERT INTO m_Item_Manufacturing_template (PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, item_Periode, tgl_berlaku, user_approve, user_delegated)
         SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder, Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate,
                1 AS Item_Status, Item_BJ, User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row,
                NULL AS item_Periode, NULL AS tgl_berlaku, NULL AS user_approve, NULL AS user_delegated
         FROM m_Item_Manufacturing_template WHERE ISNULL(item_Periode, '') = :sqlPeriode;`,
        { replacements: { sqlPeriode }, type: QueryTypes.INSERT, transaction: t }
      ));

      // 9. Approve Revision if needed
      const checkApprovalSQL = `SELECT TOP 1 appr_date FROM m_item_manufacturing_revisions WHERE Item_Group = :item_groupID ORDER BY PK_ID DESC`;
      const [latestRevision] = await capture('Select Latest Revision', () => sequelizeMSQL.query(checkApprovalSQL, {
        replacements: { item_groupID },
        type: QueryTypes.SELECT,
        transaction: t,
      }));
      if (!latestRevision || !latestRevision.appr_date) {
        await capture('Update Revision Approval', () => sequelizeMSQL.query(
          `UPDATE m_item_manufacturing_revisions SET appr_userid = :user_id, appr_delegated = :delegated_to, appr_date = :sqlDtTime WHERE Item_Group = :item_groupID AND appr_date IS NULL AND no_revisi = (SELECT TOP 1 no_revisi FROM m_item_manufacturing_revisions WHERE Item_Group = :item_groupID ORDER BY PK_ID DESC);`,
          { replacements: { user_id, delegated_to, sqlDtTime, item_groupID }, type: QueryTypes.UPDATE, transaction: t }
        ));
      }
    });

    return res.status(200).json({ message: "Data has been approved for this period!" });
  } catch (error) {
    console.error('Error approving data (cmdApproveSeparate): failedAt=', error._failedAt, 'details=', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { cmdApproveSeparate };
