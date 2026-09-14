'use strict';
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

// Config map: module key → main table + whether it uses ID_No_Sertifikat +
// the Appr_ApplicationCode Managers must be granted (m_approver_lines, Appr_No=1)
// to approve/reject reprint requests for that module.
// Mirrors the TIPE_CONFIG pattern in tidak-dapat-internal.controller.js.
const MODULE_CONFIG = {
  'sertifikat-thermo': {
    mainTable: 'T_Kalibrasi_Sertifikat_Thermohygro',
    hasIdNoSertifikat: true,
    applicationCode: 'KAL_Sert_Thermo',
  },
  'sertifikat-timbangan': {
    mainTable: 'T_Kalibrasi_Sertifikat_Timbangan',
    hasIdNoSertifikat: true,
    applicationCode: 'KAL_Sert_Timbangan',
  },
  'sertifikat-bagian': {
    mainTable: 'T_Kalibrasi_Sertifikat_bagian',
    hasIdNoSertifikat: true,
    applicationCode: 'KAL_Sert_Bagian',
  },
  'da-thermo': {
    mainTable: 'T_Kalibrasi_DA_Thermohygro',
    hasIdNoSertifikat: false,
    applicationCode: 'KAL_DA_Thermo',
  },
  'da-anak-timbangan': {
    mainTable: 'T_Kalibrasi_DA_Anak_Timbangan',
    hasIdNoSertifikat: false,
    applicationCode: 'KAL_DA_Anak_Timbang',
  },
  'da-timbangan-massa': {
    mainTable: 'T_Kalibrasi_DA_Timbangan',
    hasIdNoSertifikat: false,
    applicationCode: 'KAL_DA_Timbangan',
  },
  'da-bagian': {
    mainTable: 'T_Kalibrasi_DA_Bagian',
    hasIdNoSertifikat: false,
    applicationCode: 'KAL_DA_Bagian',
  },
};

// "Open" = still blocks a new request for the same record (spec FR-3)
const OPEN_STATUS_SQL = `(status = 'PENDING' OR (status = 'APPROVED' AND reprinted_at IS NULL))`;

const REQUEST_SELECT_SQL = `
  request_id,
  module,
  qa_id,
  id_no_sertifikat,
  instrument_name,
  instrument_code,
  status,
  reprint_remark,
  requested_by,
  requested_at,
  approved_by,
  approved_at,
  CASE
    WHEN approved_by IS NULL THEN NULL
    ELSE dbo.fnGetNamaKaryawan(approved_by)
  END AS approved_by_name,
  rejected_by,
  rejected_at,
  rejected_reason,
  reprinted_by,
  reprinted_at,
  CASE
    WHEN reprinted_by IS NULL THEN NULL
    ELSE dbo.fnGetNamaKaryawan(reprinted_by)
  END AS reprinted_by_name,
  is_manual
`;

function getModuleConfig(module) {
  return MODULE_CONFIG[module] || null;
}

function toApiShape(row) {
  return {
    requestId: row.request_id,
    module: row.module,
    qaId: row.qa_id,
    idNoSertifikat: row.id_no_sertifikat,
    instrumentName: row.instrument_name,
    instrumentCode: row.instrument_code,
    status: row.status,
    reprintRemark: row.reprint_remark,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name || null,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectedReason: row.rejected_reason,
    reprintedBy: row.reprinted_by,
    reprintedByName: row.reprinted_by_name || null,
    reprintedAt: row.reprinted_at,
    isManual: Boolean(row.is_manual),
  };
}

function badRequest(res, next, message) {
  const err = new Error(message);
  err.statusCode = 400;
  res.status(400).json({ success: false, message });
  next(err);
}

/**
 * GET /transactions/kalibrasi/label-reprint-requests/candidates?search=
 *
 * Cross-module search for the "Request Re-Print Manual" flow — legacy
 * Calibration ID data (pre calibration-workbook digitalization) that a user
 * needs to find without knowing/opening the specific module transaction page
 * first. Mirrors the shape of the existing /api/timer-da-candidates browse
 * endpoint, but unions across all 7 MODULE_CONFIG tables instead of one, and
 * only returns already-printed records (Print_LabelDate set) since that's
 * the only kind eligible for a reprint request (spec FR-2).
 */
const listReprintManualCandidates = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    if (!search) {
      return res.status(200).json({ success: true, data: [] });
    }

    const unionParts = Object.entries(MODULE_CONFIG).map(([moduleKey, cfg]) => `
      SELECT
        '${moduleKey}' AS module,
        QA_ID AS qaId,
        ${cfg.hasIdNoSertifikat ? 'ID_No_Sertifikat' : 'NULL'} AS idNoSertifikat,
        Assm_nama_instrumen AS instrumentName,
        Assm_No_identitas_kalibrasi AS instrumentCode,
        Print_LabelDate AS printLabelDate
      FROM ${cfg.mainTable}
      WHERE Print_LabelDate IS NOT NULL
        AND (
          QA_ID LIKE :like
          OR Assm_No_identitas_kalibrasi LIKE :like
          OR Assm_nama_instrumen LIKE :like
          ${cfg.hasIdNoSertifikat ? 'OR ID_No_Sertifikat LIKE :like' : ''}
        )
    `);

    const rows = await sequelizeMSQL.query(`
      SELECT TOP 50 * FROM (
        ${unionParts.join('\nUNION ALL\n')}
      ) AS candidates
      ORDER BY qaId ASC
    `, {
      replacements: { like: `%${search}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error in listReprintManualCandidates:', error);
    next(error);
  }
};

/**
 * POST /transactions/kalibrasi/label-reprint-requests
 * Body: { module, qaId, idNoSertifikat?, reprintRemark, isManual? }
 * Auth: any authenticated user — no module-specific gate (spec FR-1/FR-9,
 * confirmed decision: anyone from Admin to Manager may request a reprint).
 *
 * isManual: set true when the request originates from the "Request Re-Print
 * Manual" cross-module search page (legacy Calibration ID data, pre
 * calibration-workbook digitalization) instead of a module transaction page.
 * Same table, same approval flow — just a provenance tag shown on the
 * Pending Approvals dashboard as "(Re-Print Manual)".
 */
const createLabelReprintRequest = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { module, qaId, idNoSertifikat, reprintRemark, isManual } = req.body;

    const cfg = getModuleConfig(module);
    if (!cfg) {
      return badRequest(res, next, 'Module tidak dikenali');
    }
    if (!qaId) {
      return badRequest(res, next, 'qaId wajib diisi');
    }
    if (cfg.hasIdNoSertifikat && !idNoSertifikat) {
      return badRequest(res, next, 'idNoSertifikat wajib diisi untuk module ini');
    }
    if (!reprintRemark || !String(reprintRemark).trim()) {
      return badRequest(res, next, 'Keterangan reprint (reprintRemark) wajib diisi');
    }

    const result = await sequelizeMSQL.transaction(async (transaction) => {
      // Record must exist and must already have been printed at least once
      // (Print_LabelDate set) — reuses the existing legacy column as the
      // "already printed" signal (spec FR-2, confirmed decision — no new
      // printed_date column). OOC-only-printed records (tgl_label_tempel,
      // separate column) are intentionally NOT eligible (spec EC-8).
      const mainWhere = cfg.hasIdNoSertifikat
        ? 'WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat'
        : 'WHERE QA_ID = :qaId';

      const mainRows = await sequelizeMSQL.query(`
        SELECT TOP 1 QA_ID, Print_LabelDate, Assm_nama_instrumen, Assm_No_identitas_kalibrasi
        FROM ${cfg.mainTable}
        ${mainWhere}
      `, {
        replacements: { qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      });

      if (mainRows.length === 0) {
        const err = new Error('Data kalibrasi tidak ditemukan');
        err.statusCode = 404;
        throw err;
      }
      if (!mainRows[0].Print_LabelDate) {
        const err = new Error('Label Terkalibrasi belum pernah dicetak — reprint hanya berlaku untuk label yang sudah pernah dicetak');
        err.statusCode = 400;
        throw err;
      }

      // Block a new request if an open one already exists for this record
      const openWhere = cfg.hasIdNoSertifikat
        ? `WHERE module = :module AND qa_id = :qaId AND id_no_sertifikat = :idNoSertifikat AND ${OPEN_STATUS_SQL}`
        : `WHERE module = :module AND qa_id = :qaId AND ${OPEN_STATUS_SQL}`;

      const openRows = await sequelizeMSQL.query(`
        SELECT TOP 1 request_id FROM label_reprint_requests
        ${openWhere}
      `, {
        replacements: { module, qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      });

      if (openRows.length > 0) {
        const err = new Error('Sudah ada permintaan reprint yang masih berjalan untuk data ini');
        err.statusCode = 400;
        throw err;
      }

      await sequelizeMSQL.query(`
        INSERT INTO label_reprint_requests
          (module, qa_id, id_no_sertifikat, instrument_name, instrument_code,
           status, reprint_remark, requested_by, requested_at, updated_by, is_manual)
        VALUES
          (:module, :qaId, :idNoSertifikat, :instrumentName, :instrumentCode,
           'PENDING', :reprintRemark, :requestedBy, GETDATE(), :requestedBy, :isManual)
      `, {
        replacements: {
          module,
          qaId,
          idNoSertifikat: cfg.hasIdNoSertifikat ? idNoSertifikat : null,
          instrumentName: mainRows[0].Assm_nama_instrumen || null,
          instrumentCode: mainRows[0].Assm_No_identitas_kalibrasi || null,
          reprintRemark: String(reprintRemark).trim(),
          requestedBy: user_id,
          isManual: isManual ? 1 : 0,
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      });

      const createdWhere = cfg.hasIdNoSertifikat
        ? 'WHERE module = :module AND qa_id = :qaId AND id_no_sertifikat = :idNoSertifikat'
        : 'WHERE module = :module AND qa_id = :qaId';

      const created = await sequelizeMSQL.query(`
        SELECT TOP 1 ${REQUEST_SELECT_SQL} FROM label_reprint_requests
        ${createdWhere}
        ORDER BY request_id DESC
      `, {
        replacements: { module, qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      });

      return created[0];
    });

    return res.status(201).json({ success: true, data: toApiShape(result) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error in createLabelReprintRequest:', error);
    next(error);
  }
};

/**
 * GET /transactions/kalibrasi/label-reprint-requests/eligibility?module=&qaId=&idNoSertifikat=
 *
 * Read-only helper for the FE button states (FR-9/FR-10). Does not touch any
 * existing print/label-data endpoint's contract (NFR-3) — this is additive,
 * consumed only by the new reprint UI.
 */
const getReprintEligibility = async (req, res, next) => {
  try {
    const { module, qaId, idNoSertifikat } = req.query;

    const cfg = getModuleConfig(module);
    if (!cfg) {
      return badRequest(res, next, 'Module tidak dikenali');
    }
    if (!qaId) {
      return badRequest(res, next, 'qaId wajib diisi');
    }
    if (cfg.hasIdNoSertifikat && !idNoSertifikat) {
      return badRequest(res, next, 'idNoSertifikat wajib diisi untuk module ini');
    }

    const mainWhere = cfg.hasIdNoSertifikat
      ? 'WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat'
      : 'WHERE QA_ID = :qaId';

    const mainRows = await sequelizeMSQL.query(`
      SELECT TOP 1 Print_LabelDate FROM ${cfg.mainTable} ${mainWhere}
    `, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const alreadyPrinted = Boolean(mainRows[0]?.Print_LabelDate);

    const openWhere = cfg.hasIdNoSertifikat
      ? `WHERE module = :module AND qa_id = :qaId AND id_no_sertifikat = :idNoSertifikat AND ${OPEN_STATUS_SQL}`
      : `WHERE module = :module AND qa_id = :qaId AND ${OPEN_STATUS_SQL}`;

    const openRows = await sequelizeMSQL.query(`
      SELECT TOP 1 ${REQUEST_SELECT_SQL} FROM label_reprint_requests ${openWhere}
      ORDER BY request_id DESC
    `, {
      replacements: { module, qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const openRequest = openRows[0] ? toApiShape(openRows[0]) : null;

    return res.status(200).json({
      success: true,
      data: {
        alreadyPrinted,
        printLabelDate: mainRows[0]?.Print_LabelDate || null,
        // canRequestReprint: printed at least once, and no open/approved-not-reprinted request blocking a new one
        canRequestReprint: alreadyPrinted && !openRequest,
        // canReprint: the button in FR-10 is only enabled once a request is APPROVED and not yet reprinted
        canReprint: Boolean(openRequest && openRequest.status === 'APPROVED'),
        openRequest,
      },
    });
  } catch (error) {
    console.error('Error in getReprintEligibility:', error);
    next(error);
  }
};

/**
 * GET /transactions/kalibrasi/label-reprint-requests?module=&qaId=&idNoSertifikat=&status=
 */
const listLabelReprintRequests = async (req, res, next) => {
  try {
    const { module, qaId, idNoSertifikat, status } = req.query;

    const conditions = [];
    const replacements = {};
    if (module) {
      conditions.push('module = :module');
      replacements.module = module;
    }
    if (qaId) {
      conditions.push('qa_id = :qaId');
      replacements.qaId = qaId;
    }
    if (idNoSertifikat) {
      conditions.push('id_no_sertifikat = :idNoSertifikat');
      replacements.idNoSertifikat = idNoSertifikat;
    }
    if (status) {
      conditions.push('status = :status');
      replacements.status = status;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await sequelizeMSQL.query(`
      SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests
      ${whereClause}
      ORDER BY requested_at DESC
    `, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({ success: true, data: rows.map(toApiShape) });
  } catch (error) {
    console.error('Error in listLabelReprintRequests:', error);
    next(error);
  }
};

async function assertManagerAuthorized(module, userId, transaction) {
  const cfg = getModuleConfig(module);
  if (!cfg) {
    const err = new Error('Module tidak dikenali');
    err.statusCode = 400;
    throw err;
  }

  const approverCheck = await sequelizeMSQL.query(`
    SELECT Appr_Identity FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = :appCode
      AND Appr_ID = :userId
      AND Appr_No = 1
  `, {
    replacements: { appCode: cfg.applicationCode, userId },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  if (approverCheck.length === 0) {
    const err = new Error('Anda tidak memiliki hak untuk menyetujui/menolak reprint label ini');
    err.statusCode = 403;
    throw err;
  }
}

async function loadPendingRequestForUpdate(requestId, transaction) {
  const rows = await sequelizeMSQL.query(`
    SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests WHERE request_id = :requestId
  `, {
    replacements: { requestId },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  if (rows.length === 0) {
    const err = new Error('Request reprint tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  if (rows[0].status !== 'PENDING') {
    const err = new Error('Request reprint ini sudah diproses sebelumnya');
    err.statusCode = 409;
    throw err;
  }
  return rows[0];
}

async function loadApprovedRequestForReprint(requestId, transaction) {
  const rows = await sequelizeMSQL.query(`
    SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests WHERE request_id = :requestId
  `, {
    replacements: { requestId },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  if (rows.length === 0) {
    const err = new Error('Request reprint tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  if (rows[0].status !== 'APPROVED') {
    const err = new Error('Request reprint belum disetujui Manager');
    err.statusCode = 409;
    throw err;
  }
  if (rows[0].reprinted_at) {
    const err = new Error('Request reprint ini sudah pernah dicetak ulang');
    err.statusCode = 409;
    throw err;
  }
  return rows[0];
}

/**
 * Core approve logic, reused by both the dedicated router (below) and the
 * Pending Approvals dashboard integration (pendingCalibrationApprovals.service.js),
 * so the two entry points can't drift apart.
 */
async function approveRequestById(requestId, actorUserId) {
  return sequelizeMSQL.transaction(async (transaction) => {
    const request = await loadPendingRequestForUpdate(requestId, transaction);
    await assertManagerAuthorized(request.module, actorUserId, transaction);

    await sequelizeMSQL.query(`
      UPDATE label_reprint_requests
      SET status = 'APPROVED', approved_by = :userId, approved_at = GETDATE(), updated_by = :userId
      WHERE request_id = :requestId
    `, {
      replacements: { userId: actorUserId, requestId },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    });

    const updated = await sequelizeMSQL.query(`
      SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests WHERE request_id = :requestId
    `, {
      replacements: { requestId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    });
    return updated[0];
  });
}

/**
 * POST /transactions/kalibrasi/label-reprint-requests/:requestId/approve
 * Auth: Manager — m_approver_lines, Appr_ApplicationCode for the request's
 * module, Appr_No=1 (matches the existing per-module authorization convention,
 * e.g. KAL_Sert_Thermo / KAL_DA_Bagian checks elsewhere in this codebase).
 */
const approveLabelReprintRequest = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { requestId } = req.params;

    const result = await approveRequestById(requestId, user_id);

    return res.status(200).json({ success: true, data: toApiShape(result) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error in approveLabelReprintRequest:', error);
    next(error);
  }
};

/**
 * Core reject logic, reused by both the dedicated router (below) and the
 * Pending Approvals dashboard integration.
 */
async function rejectRequestById(requestId, actorUserId, rejectedReason) {
  const trimmedReason = String(rejectedReason || '').trim();
  if (!trimmedReason) {
    const err = new Error('rejectedReason wajib diisi');
    err.statusCode = 400;
    throw err;
  }

  return sequelizeMSQL.transaction(async (transaction) => {
    const request = await loadPendingRequestForUpdate(requestId, transaction);
    await assertManagerAuthorized(request.module, actorUserId, transaction);

    await sequelizeMSQL.query(`
      UPDATE label_reprint_requests
      SET status = 'REJECTED', rejected_by = :userId, rejected_at = GETDATE(),
          rejected_reason = :rejectedReason, updated_by = :userId
      WHERE request_id = :requestId
    `, {
      replacements: { userId: actorUserId, requestId, rejectedReason: trimmedReason },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    });

    const updated = await sequelizeMSQL.query(`
      SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests WHERE request_id = :requestId
    `, {
      replacements: { requestId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    });
    return updated[0];
  });
}

/**
 * POST /transactions/kalibrasi/label-reprint-requests/:requestId/reject
 * Body: { rejectedReason }
 * Auth: same Manager gate as approve.
 */
const rejectLabelReprintRequest = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { requestId } = req.params;
    const { rejectedReason } = req.body;

    const result = await rejectRequestById(requestId, user_id, rejectedReason);

    return res.status(200).json({ success: true, data: toApiShape(result) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error in rejectLabelReprintRequest:', error);
    next(error);
  }
};

async function markRequestReprintedById(requestId, actorUserId) {
  return sequelizeMSQL.transaction(async (transaction) => {
    await loadApprovedRequestForReprint(requestId, transaction);

    await sequelizeMSQL.query(`
      UPDATE label_reprint_requests
      SET reprinted_by = :userId, reprinted_at = GETDATE(), updated_by = :userId
      WHERE request_id = :requestId
    `, {
      replacements: { userId: actorUserId, requestId },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    });

    const updated = await sequelizeMSQL.query(`
      SELECT ${REQUEST_SELECT_SQL} FROM label_reprint_requests WHERE request_id = :requestId
    `, {
      replacements: { requestId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    });
    return updated[0];
  });
}

/**
 * POST /transactions/kalibrasi/label-reprint-requests/:requestId/reprint
 * Auth: any authenticated user may execute an approved reprint once.
 */
const markLabelReprintRequestReprinted = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { requestId } = req.params;

    const result = await markRequestReprintedById(requestId, user_id);

    return res.status(200).json({ success: true, data: toApiShape(result) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Error in markLabelReprintRequestReprinted:', error);
    next(error);
  }
};

module.exports = {
  MODULE_CONFIG,
  toApiShape,
  createLabelReprintRequest,
  listLabelReprintRequests,
  listReprintManualCandidates,
  getReprintEligibility,
  approveLabelReprintRequest,
  rejectLabelReprintRequest,
  markLabelReprintRequestReprinted,
  // Core logic, reused by pendingCalibrationApprovals.service.js so the
  // dashboard's approve/reject actions can't drift from the dedicated endpoints.
  approveRequestById,
  rejectRequestById,
  markRequestReprintedById,
};
