const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const path = require('path');
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const { type } = require('os');

const getModuleRevisionsDA = async (req, res) => {
  try {
    const { modulename, isApprove } = req.query;
    console.log({isApprove, type: typeof req.query.isApprove});
    if (!modulename) {
      return res.status(400).json({ message: 'Module name is required.' });
    }

    let query = `
      SELECT
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData
      FROM m_module_revisions
      WHERE modulename = :modulename
    `;

    if (isApprove === 'true' || isApprove === '1') {
      query += `
        AND appr_date IS NOT NULL
        AND appr_userid IS NOT NULL
        AND appr_userid <> ''
      `;
    }

    query += `
      ORDER BY no_revisi DESC
    `;

    const revisions = await sequelizeMSQL.query(query, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (revisions.length === 0) {
      return res.status(404).json({ message: 'No revisions found for the given module name.' });
    }

    return res.status(200).json({ message: 'Module revisions fetched successfully.', data: revisions });
  } catch (error) {
    console.error('Error fetching module revisions:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const createModuleRevision = async (req, res) => {
  try {
    const { modulename, tgl_revisi, alasan_desc, appr_userid, appr_delegated, appr_date, extraData } = req.body;

    if (!modulename || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'modulename, tgl_revisi, and alasan_desc are required.' });
    }

    // Get latest no_revisi for this modulename
    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_module_revisions
      WHERE modulename = :modulename
      ORDER BY no_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    const new_no_revisi = latestRevision ? parseInt(latestRevision.no_revisi, 10) + 1 : 1;

    const query = `
      INSERT INTO m_module_revisions (
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData
      )
      VALUES (
        :modulename,
        :new_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :extraData
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        modulename,
        new_no_revisi,
        tgl_revisi,
        alasan_desc,
        appr_userid: appr_userid || '',
        appr_delegated: appr_delegated || '',
        appr_date: appr_date || null,
        extraData: extraData || null,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Module revision created successfully.' });
  } catch (error) {
    console.error('Error creating module revision:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const createModuleRevisionWithSameNumber = async (req, res) => {
  try {
    const { modulename, tgl_revisi, alasan_desc, appr_userid, appr_delegated, appr_date, extraData } = req.body;

    if (!modulename || !tgl_revisi || !alasan_desc) {
      return res.status(400).json({ message: 'modulename, tgl_revisi, and alasan_desc are required.' });
    }

    // Fetch the latest revision for the given modulename
    const queryLatestRevision = `
      SELECT TOP 1 no_revisi
      FROM m_module_revisions
      WHERE modulename = :modulename
      ORDER BY tgl_revisi DESC
    `;

    const [latestRevision] = await sequelizeMSQL.query(queryLatestRevision, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });


    console.log({latestRevision});

    if (!latestRevision) {
      return res.status(404).json({ message: 'No revisions found for the given modulename.' });
    }

    const same_no_revisi = parseInt(latestRevision.no_revisi, 10);

    // Insert a new revision with the same no_revisi but newer tgl_revisi and alasan_desc
    const query = `
      INSERT INTO m_module_revisions (
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData
      )
      VALUES (
        :modulename,
        :same_no_revisi,
        :tgl_revisi,
        :alasan_desc,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :extraData
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        modulename,
        same_no_revisi,
        tgl_revisi,
        alasan_desc,
        appr_userid: appr_userid || '',
        appr_delegated: appr_delegated || '',
        appr_date: appr_date || null,
        extraData: extraData || null,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(201).json({ message: 'Module revision created successfully with the same revision number.' });
  } catch (error) {
    console.error('Error creating module revision with the same number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getLatestModuleRevisionNumber = async (req, res) => {
  try {
    const { modulename } = req.query;

    if (!modulename) {
      return res.status(400).json({ message: 'Module name is required.' });
    }

    // Query to fetch the latest revision number where `appr_date` is null
    const query = `
      SELECT TOP 1 *
      FROM m_module_revisions
      WHERE modulename = :modulename AND appr_date IS NULL
      ORDER BY no_revisi DESC
    `;

    const [result] = await sequelizeMSQL.query(query, {
      replacements: { modulename },
      type: Sequelize.QueryTypes.SELECT,
    });

    // If no result is found, fallback to fetch the latest revision number
    if (!result) {
      const fallbackQuery = `
        SELECT TOP 1 *
        FROM m_module_revisions
        WHERE modulename = :modulename
        ORDER BY no_revisi DESC
      `;

      const [fallbackResult] = await sequelizeMSQL.query(fallbackQuery, {
        replacements: { modulename },
        type: Sequelize.QueryTypes.SELECT,
      });

      // If no fallback result is found, return 1 as the first revision number
      if (!fallbackResult) {
        return res.status(200).json({ no_revisi: 1 });
      }

      // Increment the fallback result by 1
      const newRevision = parseInt(fallbackResult.no_revisi, 10) + 1;
      return res.status(200).json({ no_revisi: newRevision });
    }

    // Return the latest revision number from the first query
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching latest module revision number:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const approveModuleRevisionByModuleName = async (modulename, user_id, delegated_to) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    if (!modulename || !user_id || !delegated_to) {
      throw new Error('modulename, user_id, and delegated_to are required.');
    }

    const sqlDtTime = moment().format('YYYY-MM-DD HH:mm:ss');

    // Check if the user is an approver (change 'MODULE' if your application code is different)
    const approver = await sequelizeMSQL.query(
      `SELECT TOP 1 Appr_Identity FROM m_Approver_Lines WHERE isactive = 1 AND Appr_ApplicationCode LIKE 'MODULE' AND Appr_ID LIKE :user_id`,
      { replacements: { user_id }, type: QueryTypes.SELECT }
    );

    if (!approver || approver.length === 0) {
      throw new Error('User is not authorized to approve.');
    }

    const sqlAppr_Identity = approver[0]?.Appr_Identity || '0000';

    if (!sqlAppr_Identity || sqlAppr_Identity === '0000') return 0; // Approval failed
    console.log({ Approval: sqlAppr_Identity, status: "failed" });

    const updateQuery = `
      UPDATE m_module_revisions
      SET appr_userid = :user_id,
          appr_delegated = :delegated_to,
          appr_date = :sqlDtTime
      WHERE modulename = :modulename
        AND appr_date IS NULL;
    `;

    const [updateResult] = await sequelizeMSQL.query(updateQuery, {
      replacements: { user_id, delegated_to, sqlDtTime, modulename },
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
    console.error('Error approving module revision:', error);
    await transaction.rollback();
    return 0; // Approval failed
  }
};

const updateOrCreateModuleRevision = async (req, res) => {
  const { modulename, no_revisi, tgl_revisi, alasan_desc, appr_userid, appr_delegated, appr_date, extraData } = req.body;
  // You may get user_id and delegated_to from req.user if needed

  if (!modulename || !no_revisi || !tgl_revisi || !alasan_desc) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Validate tgl_revisi
  const cutoffDate = new Date('2025-02-25');
  const inputDate = new Date(tgl_revisi);

  if (inputDate < cutoffDate) {
    return res.status(400).json({ message: "tgl_revisi cannot be earlier than 25th February 2025." });
  }
  const transaction = await sequelizeMSQL.transaction();
  try {
    // Check if a record with the given no_revisi exists for this modulename
    const queryCheck = `
      SELECT TOP 1 PK_ID
      FROM m_module_revisions
      WHERE modulename = :modulename AND no_revisi = :no_revisi
    `;

    const [existingRecord] = await sequelizeMSQL.query(queryCheck, {
      replacements: { modulename, no_revisi },
      type: QueryTypes.SELECT,
    });

    if (existingRecord) {
      // Update the existing record
      const queryUpdate = `
        UPDATE m_module_revisions
        SET alasan_desc = :alasan_desc,
            tgl_revisi = :tgl_revisi,
            appr_userid = :appr_userid,
            appr_delegated = :appr_delegated,
            appr_date = :appr_date,
            extraData = :extraData
        WHERE no_revisi = :no_revisi AND modulename = :modulename
      `;

      await sequelizeMSQL.query(queryUpdate, {
        replacements: {
          no_revisi,
          tgl_revisi,
          alasan_desc,
          modulename,
          appr_userid: appr_userid || '',
          appr_delegated: appr_delegated || '',
          appr_date: appr_date || null,
          extraData: extraData || null,
        },
        transaction,
      });

      await transaction.commit();
      return res.status(200).json({ message: "Module revision updated successfully." });
    } else {
      // Create a new record
      const queryInsert = `
        INSERT INTO m_module_revisions (
          modulename,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          Process_Date,
          appr_userid,
          appr_delegated,
          appr_date,
          extraData
        )
        VALUES (
          :modulename,
          :no_revisi,
          :tgl_revisi,
          :alasan_desc,
          GETDATE(),
          :appr_userid,
          :appr_delegated,
          :appr_date,
          :extraData
        )
      `;

      await sequelizeMSQL.query(queryInsert, {
        replacements: {
          modulename,
          no_revisi,
          tgl_revisi,
          alasan_desc,
          appr_userid: appr_userid || '',
          appr_delegated: appr_delegated || '',
          appr_date: appr_date || null,
          extraData: extraData || null,
        },
        transaction,
      });

      await transaction.commit();
      return res.status(201).json({ message: "Module revision created successfully." });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error in updateOrCreateModuleRevision:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  getModuleRevisionsDA,
  createModuleRevision,
  createModuleRevisionWithSameNumber,
  getLatestModuleRevisionNumber,
  approveModuleRevisionByModuleName,
  updateOrCreateModuleRevision,
};