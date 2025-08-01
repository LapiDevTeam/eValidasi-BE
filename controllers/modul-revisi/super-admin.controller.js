const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize, QueryTypes } = require('sequelize');

/**
 * Get all module revisions
 * Super admin endpoint without validation
 */
const getAllModuleRevisions = async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM m_module_revisions
      ORDER BY modulename, no_revisi DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      type: QueryTypes.SELECT
    });

    // Parse JSON fields if they exist
    const parsedResults = results.map(item => ({
      ...item,
      daftar_distribusi: parseJsonField(item.daftar_distribusi),
      refrensi: parseJsonField(item.refrensi),
      dokumen_terkait: parseJsonField(item.dokumen_terkait),
      extraData: parseJsonField(item.extraData)
    }));

    return res.status(200).json(parsedResults);
  } catch (error) {
    console.error('Super admin error getting all module revisions:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Get a specific module revision by ID
 * Super admin endpoint without validation
 */
const getModuleRevisionById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT *
      FROM m_module_revisions
      WHERE PK_ID = :id
    `;

    const [result] = await sequelizeMSQL.query(query, {
      replacements: { id },
      type: QueryTypes.SELECT
    });

    if (!result) {
      return res.status(404).json({ message: 'Module revision not found' });
    }

    // Parse JSON fields if they exist
    const parsedResult = {
      ...result,
      daftar_distribusi: parseJsonField(result.daftar_distribusi),
      refrensi: parseJsonField(result.refrensi),
      dokumen_terkait: parseJsonField(result.dokumen_terkait),
      extraData: parseJsonField(result.extraData)
    };

    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error('Super admin error getting module revision by id:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Create a new module revision
 * Super admin endpoint without validation
 */
const createModuleRevision = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const {
      modulename,
      no_revisi,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi,
      refrensi,
      dokumen_terkait,
      appr_userid,
      appr_delegated,
      appr_date,
      extraData,
      mgr_userid
    } = req.body;

    // Get next PK_ID
    const [pkidResult] = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(PK_ID), 0) + 1 AS PK_ID FROM m_module_revisions`,
      { type: QueryTypes.SELECT, transaction }
    );
    const PK_ID = pkidResult.PK_ID;

    // Stringify JSON fields if they exist
    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;
    const stringExtraData = extraData ? JSON.stringify(extraData) : null;

    const query = `
      INSERT INTO m_module_revisions (
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi,
        refrensi,
        dokumen_terkait,
        Process_Date,
        appr_userid,
        appr_delegated,
        appr_date,
        extraData,
        mgr_userid
      )
      VALUES (
        :PK_ID,
        :modulename,
        :no_revisi,
        :tgl_revisi,
        :alasan_desc,
        :daftar_distribusi,
        :refrensi,
        :dokumen_terkait,
        GETDATE(),
        :appr_userid,
        :appr_delegated,
        :appr_date,
        :extraData,
        :mgr_userid
      )
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        PK_ID,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        refrensi: stringRefrensi,
        dokumen_terkait: stringDokumenTerkait,
        appr_userid: appr_userid || null,
        appr_delegated: appr_delegated || null,
        appr_date: appr_date || null,
        extraData: stringExtraData,
        mgr_userid: mgr_userid || null
      },
      type: QueryTypes.INSERT,
      transaction
    });

    await transaction.commit();
    return res.status(201).json({
      message: 'Module revision created successfully',
      data: { PK_ID, modulename, no_revisi }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Super admin error creating module revision:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Update a module revision by ID
 * Super admin endpoint without validation
 */
const updateModuleRevision = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { id } = req.params;
    const {
      modulename,
      no_revisi,
      tgl_revisi,
      alasan_desc,
      daftar_distribusi,
      refrensi,
      dokumen_terkait,
      appr_userid,
      appr_delegated,
      appr_date,
      extraData,
      mgr_userid
    } = req.body;

    // Check if record exists
    const checkQuery = `SELECT PK_ID FROM m_module_revisions WHERE PK_ID = :id`;
    const [existingRecord] = await sequelizeMSQL.query(checkQuery, {
      replacements: { id },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!existingRecord) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Module revision not found' });
    }

    // Stringify JSON fields if they exist
    const stringDaftarDistribusi = daftar_distribusi ? JSON.stringify(daftar_distribusi) : null;
    const stringRefrensi = refrensi ? JSON.stringify(refrensi) : null;
    const stringDokumenTerkait = dokumen_terkait ? JSON.stringify(dokumen_terkait) : null;
    const stringExtraData = extraData ? JSON.stringify(extraData) : null;

    const query = `
      UPDATE m_module_revisions
      SET modulename = :modulename,
          no_revisi = :no_revisi,
          tgl_revisi = :tgl_revisi,
          alasan_desc = :alasan_desc,
          daftar_distribusi = :daftar_distribusi,
          refrensi = :refrensi,
          dokumen_terkait = :dokumen_terkait,
          appr_userid = :appr_userid,
          appr_delegated = :appr_delegated,
          appr_date = :appr_date,
          extraData = :extraData,
          mgr_userid = :mgr_userid
      WHERE PK_ID = :id
    `;

    await sequelizeMSQL.query(query, {
      replacements: {
        id,
        modulename,
        no_revisi,
        tgl_revisi,
        alasan_desc,
        daftar_distribusi: stringDaftarDistribusi,
        refrensi: stringRefrensi,
        dokumen_terkait: stringDokumenTerkait,
        appr_userid: appr_userid || null,
        appr_delegated: appr_delegated || null,
        appr_date: appr_date || null,
        extraData: stringExtraData,
        mgr_userid: mgr_userid || null
      },
      type: QueryTypes.UPDATE,
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Module revision updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Super admin error updating module revision:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

/**
 * Delete a module revision by ID
 * Super admin endpoint without validation
 */
const deleteModuleRevision = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { id } = req.params;

    // Check if record exists
    const checkQuery = `SELECT PK_ID FROM m_module_revisions WHERE PK_ID = :id`;
    const [existingRecord] = await sequelizeMSQL.query(checkQuery, {
      replacements: { id },
      type: QueryTypes.SELECT,
      transaction
    });

    if (!existingRecord) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Module revision not found' });
    }

    const query = `DELETE FROM m_module_revisions WHERE PK_ID = :id`;

    await sequelizeMSQL.query(query, {
      replacements: { id },
      type: QueryTypes.DELETE,
      transaction
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Module revision deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Super admin error deleting module revision:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Helper function to parse JSON fields
const parseJsonField = (field) => {
  if (!field) return null;
  try {
    return JSON.parse(field);
  } catch (error) {
    return field;
  }
};

module.exports = {
  getAllModuleRevisions,
  getModuleRevisionById,
  createModuleRevision,
  updateModuleRevision,
  deleteModuleRevision
};