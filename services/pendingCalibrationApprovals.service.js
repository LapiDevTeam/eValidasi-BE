'use strict';

/**
 * Pending Calibration Approvals Service
 *
 * Aggregates pending approval requests across all calibration session tables
 * (both Thermohygrometer-style T_*_Workbook_Session tables, the legacy-style
 * <instrument>_sessions tables, and the DA / Sertifikat Bagian MSSQL tables)
 * and performs role-based approvals.
 *
 * Approval hierarchy: Admin -> Officer/Supervisor -> Manager
 *   - jobLevel > 6          : Admin
 *   - jobLevel 5 or 6       : Officer/Supervisor
 *   - jobLevel 3            : Manager
 */

const { createRequest } = require('../repositories/calibration-workbook.repository');
const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { Sequelize } = require('../models');

const ROLES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    status: 'APPROVED_ADMIN',
    rank: 1,
  },
  officer: {
    key: 'officer',
    label: 'Officer/Supervisor',
    status: 'APPROVED_OFFICER',
    rank: 2,
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    status: 'APPROVED',
    rank: 3,
  },
};

const ROLE_ORDER = ['admin', 'officer', 'manager'];

const BAGIAN_MODULES = new Set([
  'da-bagian',
  'sertifikat-bagian',
  'da-thermo',
  'sertifikat-thermo',
  'kalibrasi-eksternal',
]);

function isBagianModule(module) {
  return BAGIAN_MODULES.has(String(module || '').toLowerCase());
}

function canApproveRole(userRole, pendingRole) {
  if (!userRole || !pendingRole) return false;
  return userRole.rank >= pendingRole.rank;
}

/**
 * Module registry.
 * Each entry maps the public module slug to its database table and columns.
 * conforming = true for modules that already use T_*_Workbook_Session style
 *              (PascalCase approval columns).
 */
const MODULE_REGISTRY = {
  thermohygrometer: {
    displayName: 'Thermo Workbook',
    table: 'dbo.T_Kalibrasi_Thermohygro_Workbook_Session',
    idColumn: 'Session_ID',
    instrumentNameColumn: 'ThermoDa.Assm_nama_instrumen',
    calibrationDateColumn: 'ThermoDa.Tgl_kalibrasi',
    qaIdColumn: 'QA_ID',
    idNoSertifikatColumn: 'ID_No_Sertifikat',
    userIdColumn: 'UserID',
    updateDateColumn: 'Update_Date',
    processDateColumn: 'Process_Date',
    statusColumn: 'Status',
    conforming: true,
    routePrefix: '/thermohygrometer-calibration',
    detailApply: `
      OUTER APPLY (
        SELECT TOP 1
          D.Assm_nama_instrumen,
          D.Tgl_kalibrasi
        FROM dbo.T_Kalibrasi_DA_Thermohygro AS D
        WHERE D.QA_ID = S.QA_ID
        ORDER BY D.Process_date DESC
      ) AS ThermoDa
    `,
    buildDeepLink: ({ raw, qaId, idNoSertifikat }) => {
      const params = [`sessionId=${encodeURIComponent(raw.id)}`];
      if (qaId) params.push(`qa_id=${encodeURIComponent(qaId)}`);
      if (idNoSertifikat) {
        params.push(`id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`);
      }
      return `/thermohygrometer-calibration?${params.join('&')}`;
    },
    approvalColumns: {
      admin: 'ApprovedByAdmin',
      adminDate: 'ApprovedByAdminDate',
      officer: 'ApprovedByOfficer',
      officerDate: 'ApprovedByOfficerDate',
      manager: 'ApprovedByManager',
      managerDate: 'ApprovedByManagerDate',
      rejectedBy: 'RejectedBy',
      rejectedReason: 'RejectedReason',
      rejectedAt: 'RejectedAt',
    },
  },
  moisture: {
    displayName: 'Moisture Analyzer',
    table: 'dbo.T_Kalibrasi_Moisture_Workbook_Session',
    idColumn: 'Session_ID',
    instrumentNameColumn: null,
    calibrationDateColumn: null,
    qaIdColumn: 'QA_ID',
    idNoSertifikatColumn: 'ID_No_Sertifikat',
    userIdColumn: 'UserID',
    updateDateColumn: 'Update_Date',
    processDateColumn: 'Process_Date',
    statusColumn: 'Status',
    conforming: true,
    routePrefix: '/moisture-calibration',
    approvalColumns: {
      admin: 'ApprovedByAdmin',
      adminDate: 'ApprovedByAdminDate',
      officer: 'ApprovedByOfficer',
      officerDate: 'ApprovedByOfficerDate',
      manager: 'ApprovedByManager',
      managerDate: 'ApprovedByManagerDate',
      rejectedBy: 'RejectedBy',
      rejectedReason: 'RejectedReason',
      rejectedAt: 'RejectedAt',
    },
  },
  friability: {
    displayName: 'Friability Tester',
    table: 'dbo.T_Kalibrasi_Friability_Workbook_Session',
    idColumn: 'Session_ID',
    instrumentNameColumn: null,
    calibrationDateColumn: null,
    qaIdColumn: 'QA_ID',
    idNoSertifikatColumn: 'ID_No_Sertifikat',
    userIdColumn: 'UserID',
    updateDateColumn: 'Update_Date',
    processDateColumn: 'Process_Date',
    statusColumn: 'Status',
    conforming: true,
    routePrefix: '/friability-calibration',
    approvalColumns: {
      admin: 'ApprovedByAdmin',
      adminDate: 'ApprovedByAdminDate',
      officer: 'ApprovedByOfficer',
      officerDate: 'ApprovedByOfficerDate',
      manager: 'ApprovedByManager',
      managerDate: 'ApprovedByManagerDate',
      rejectedBy: 'RejectedBy',
      rejectedReason: 'RejectedReason',
      rejectedAt: 'RejectedAt',
    },
  },
  timer: {
    displayName: 'Timer',
    table: 'dbo.timer_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/timer-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  timbangan: {
    displayName: 'Timbangan',
    table: 'dbo.timbangan_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/timbangan-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  temperature: {
    displayName: 'Temperature',
    table: 'dbo.temperature_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/temperature-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  disintegration: {
    displayName: 'Disintegration Tester',
    table: 'dbo.disintegration_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/disintegration-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  rpm: {
    displayName: 'RPM',
    table: 'dbo.rpm_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/rpm-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  'tapped-volumeter': {
    displayName: 'Tapped Volumeter',
    table: 'dbo.tapped_volumeter_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: 'qa_id',
    idNoSertifikatColumn: 'id_no_sertifikat',
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/tapped-volumeter-calibration',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
  'calibration-workbook': {
    displayName: 'Pressure / Calibration Workbook',
    table: 'dbo.calibration_sessions',
    idColumn: 'session_id',
    instrumentNameColumn: 'instrument_name',
    calibrationDateColumn: 'calibration_date',
    qaIdColumn: null,
    idNoSertifikatColumn: null,
    userIdColumn: 'created_by',
    updateDateColumn: 'updated_at',
    processDateColumn: 'created_at',
    statusColumn: 'status',
    conforming: false,
    routePrefix: '/calibration-workbook',
    approvalColumns: {
      admin: 'approved_by_admin',
      adminDate: 'approved_by_admin_date',
      officer: 'approved_by_officer',
      officerDate: 'approved_by_officer_date',
      manager: 'approved_by_manager',
      managerDate: 'approved_by_manager_date',
      rejectedBy: 'rejected_by',
      rejectedReason: 'rejected_reason',
      rejectedAt: 'rejected_at',
    },
  },
};

function getWorkbookApprovalRole(jobLevel) {
  const level = Number(jobLevel);
  if (Number.isNaN(level)) return null;

  if (level > 6) return ROLES.admin;
  if (level === 5 || level === 6) return ROLES.officer;
  if (level === 3) return ROLES.manager;
  return null;
}

function getPendingRole(session) {
  if (!session.approvedByAdmin) return ROLES.admin;
  if (!session.approvedByOfficer) return ROLES.officer;
  if (!session.approvedByManager) return ROLES.manager;
  return null;
}

function assertApprovalOrder(session, role) {
  if (!role) return 'User tidak memiliki role approval workbook';

  const pending = getPendingRole(session);
  if (!pending) return 'Workbook sudah fully approved';

  if (!canApproveRole(role, pending)) {
    return `Role ${role.label} tidak bisa melakukan approval ${pending.label}`;
  }

  return '';
}

function normalizeValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function normalizeDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function buildConformingDeepLink(routePrefix, qaId, idNoSertifikat) {
  const params = [];
  if (qaId) params.push(`qa_id=${encodeURIComponent(qaId)}`);
  if (idNoSertifikat) {
    params.push(`id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`);
  }
  return params.length ? `${routePrefix}?${params.join('&')}` : routePrefix;
}

function moduleKeys() {
  return Object.keys(MODULE_REGISTRY);
}

const columnExistenceCache = new Map();

async function getExistingColumns(tableName) {
  if (columnExistenceCache.has(tableName)) {
    return columnExistenceCache.get(tableName);
  }

  const request = await createRequest();
  const result = await request.query(`
    SELECT c.name AS column_name
    FROM sys.columns AS c
    INNER JOIN sys.objects AS o ON o.object_id = c.object_id
    WHERE o.object_id = OBJECT_ID('${tableName}')
  `);

  const existing = new Set(result.recordset.map((row) => row.column_name));
  columnExistenceCache.set(tableName, existing);
  return existing;
}

async function assertTableAndColumns(config) {
  const existing = await getExistingColumns(config.table);
  if (existing.size === 0) {
    const err = new Error(`Table ${config.table} does not exist`);
    err.statusCode = 404;
    throw err;
  }

  const requiredApprovalCols = [
    config.approvalColumns.admin,
    config.approvalColumns.adminDate,
    config.approvalColumns.officer,
    config.approvalColumns.officerDate,
    config.approvalColumns.manager,
    config.approvalColumns.managerDate,
  ];

  const missing = requiredApprovalCols.filter((col) => !existing.has(col));
  if (missing.length > 0) {
    const err = new Error(`Missing approval columns in ${config.table}: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return existing;
}

function columnExpression(columnName, tableAlias = 'S') {
  if (!columnName) return '';
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(columnName)
    ? `${tableAlias}.${columnName}`
    : columnName;
}

function columnOrNull(columnName, alias) {
  if (!columnName) {
    return `NULL AS ${alias}`;
  }
  return `${columnExpression(columnName)} AS ${alias}`;
}

function coalesceLike(columnName, searchParam) {
  if (!columnName) {
    return `'' LIKE ${searchParam}`;
  }
  return `COALESCE(${columnExpression(columnName)}, '') LIKE ${searchParam}`;
}

function parseModule(module) {
  const key = String(module || '').toLowerCase();
  const config = MODULE_REGISTRY[key];
  if (!config) {
    const error = new Error(`Unknown calibration module: ${module}`);
    error.statusCode = 400;
    throw error;
  }
  return { key, config };
}

/**
 * Build the SELECT / WHERE clause for a single module.
 * Returns rows where at least one approval column is still NULL and the session
 * is in a state that can be approved (CALCULATED or an intermediate approval).
 */
async function scanModule(config, filters = {}) {
  const ac = config.approvalColumns;
  const existing = await assertTableAndColumns(config);
  const request = await createRequest();

  const selectCols = [
    `${columnExpression(config.idColumn)} AS id`,
    columnOrNull(config.qaIdColumn, 'qaId'),
    columnOrNull(config.idNoSertifikatColumn, 'idNoSertifikat'),
    columnOrNull(config.instrumentNameColumn, 'instrumentName'),
    columnOrNull(config.calibrationDateColumn, 'calibrationDate'),
    columnOrNull(config.userIdColumn, 'requester'),
    columnOrNull(config.updateDateColumn, 'updateDate'),
    columnOrNull(config.processDateColumn, 'processDate'),
  ];

  // Approval columns selected with camelCase aliases for normalization.
  selectCols.push(`ISNULL(${columnExpression(ac.admin)}, '') AS approvedByAdmin`);
  selectCols.push(`${columnExpression(ac.adminDate)} AS approvedByAdminDate`);
  selectCols.push(`ISNULL(${columnExpression(ac.officer)}, '') AS approvedByOfficer`);
  selectCols.push(`${columnExpression(ac.officerDate)} AS approvedByOfficerDate`);
  selectCols.push(`ISNULL(${columnExpression(ac.manager)}, '') AS approvedByManager`);
  selectCols.push(`${columnExpression(ac.managerDate)} AS approvedByManagerDate`);

  let query = `
    SELECT TOP 200
      ${selectCols.join(', ')}
    FROM ${config.table} AS S
    ${config.detailApply || ''}
    WHERE (
      ${columnExpression(ac.admin)} IS NULL
      OR ${columnExpression(ac.officer)} IS NULL
      OR ${columnExpression(ac.manager)} IS NULL
    )
  `;

  if (config.conforming && existing.has(config.statusColumn)) {
    query += `
      AND ${columnExpression(config.statusColumn)} IN ('CALCULATED', 'APPROVED_ADMIN', 'APPROVED_OFFICER')
    `;
  } else if (existing.has(config.statusColumn)) {
    query += `
      AND ${columnExpression(config.statusColumn)} IN ('CALCULATED', 'FINALIZED', 'PUBLISHED')
    `;
  }

  if (filters.search) {
    const search = `%${filters.search.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    request.input('Search', search);
    query += `
      AND (
        CAST(${columnExpression(config.idColumn)} AS NVARCHAR(50)) LIKE @Search
        OR ${coalesceLike(config.qaIdColumn, '@Search')}
        OR ${coalesceLike(config.idNoSertifikatColumn, '@Search')}
        OR ${coalesceLike(config.instrumentNameColumn, '@Search')}
      )
    `;
  }

  const sortColumn = config.updateDateColumn || config.processDateColumn;
  if (existing.has(sortColumn)) {
    query += ` ORDER BY ${columnExpression(sortColumn)} DESC`;
  } else {
    query += ` ORDER BY ${columnExpression(config.idColumn)} DESC`;
  }

  const result = await request.query(query);
  return result.recordset;
}

function normalizeRow(config, moduleKey, raw) {
  const pendingRole = getPendingRole({
    approvedByAdmin: raw.approvedByAdmin,
    approvedByOfficer: raw.approvedByOfficer,
    approvedByManager: raw.approvedByManager,
  });

  const qaId = normalizeValue(raw.qaId);
  const idNoSertifikat = normalizeValue(raw.idNoSertifikat);
  const deepLink = typeof config.buildDeepLink === 'function'
    ? config.buildDeepLink({ raw, qaId, idNoSertifikat })
    : config.conforming
      ? buildConformingDeepLink(config.routePrefix, qaId, idNoSertifikat)
      : `${config.routePrefix}?sessionId=${encodeURIComponent(raw.id)}`;

  return {
    module: moduleKey,
    moduleDisplayName: config.displayName,
    sessionId: raw.id,
    qaId,
    idNoSertifikat,
    instrumentName: normalizeValue(raw.instrumentName),
    calibrationDate: normalizeDate(raw.calibrationDate),
    requester: normalizeValue(raw.requester),
    updatedAt: normalizeDate(raw.updateDate || raw.processDate),
    approvedByAdmin: normalizeValue(raw.approvedByAdmin),
    approvedByAdminDate: normalizeDate(raw.approvedByAdminDate),
    approvedByOfficer: normalizeValue(raw.approvedByOfficer),
    approvedByOfficerDate: normalizeDate(raw.approvedByOfficerDate),
    approvedByManager: normalizeValue(raw.approvedByManager),
    approvedByManagerDate: normalizeDate(raw.approvedByManagerDate),
    pendingLevel: pendingRole ? pendingRole.key : null,
    pendingRole: pendingRole ? pendingRole.label : null,
    deepLink,
  };
}

// =============================================================================
// DA BAGIAN & SERTIFIKAT BAGIAN
// =============================================================================

function buildLikeSearch(rawSearch) {
  const text = String(rawSearch || '').trim();
  if (!text) return null;
  const escaped = text.replace(/%/g, '\\%').replace(/_/g, '\\_');
  return `%${escaped}%`;
}

function normalizeDaBagianRow(raw) {
  const qaId = normalizeValue(raw.QA_ID);
  return {
    module: 'da-bagian',
    moduleDisplayName: 'DA Bagian',
    sessionId: qaId,
    qaId,
    idNoSertifikat: '',
    instrumentName: normalizeValue(raw.Assm_nama_instrumen),
    calibrationDate: normalizeDate(raw.Tgl_kalibrasi),
    requester: normalizeValue(raw.UserID),
    updatedAt: normalizeDate(raw.Process_date),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'approver',
    pendingRole: 'Approver',
    deepLink: `/da-bagian?qa_id=${encodeURIComponent(qaId)}`,
  };
}

async function scanDaBagianPending(rawSearch) {
  const search = buildLikeSearch(rawSearch);
  const replacements = {};
  let where = `
    WHERE NOT EXISTS (
      SELECT 1 FROM T_Kalibrasi_DA_Bagian_status AS S
      WHERE S.QA_ID = A.QA_ID AND S.Approver_No = 1
    )
  `;

  if (search) {
    where += `
      AND (
        A.QA_ID LIKE :search
        OR A.Assm_nama_instrumen LIKE :search
      )
    `;
    replacements.search = search;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.Assm_nama_instrumen,
      A.Tgl_kalibrasi,
      A.UserID,
      A.Process_date
    FROM T_Kalibrasi_DA_Bagian AS A
    ${where}
    ORDER BY A.Process_date DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeDaBagianRow(raw));
}

function normalizeSertifikatBagianRow(raw) {
  const qaId = normalizeValue(raw.QA_ID);
  const idNoSertifikat = normalizeValue(raw.ID_No_Sertifikat);
  return {
    module: 'sertifikat-bagian',
    moduleDisplayName: 'Sertifikat Bagian',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    instrumentName: normalizeValue(raw.Assm_nama_instrumen),
    calibrationDate: normalizeDate(raw.Tgl_kalibrasi),
    requester: normalizeValue(raw.UserID),
    updatedAt: normalizeDate(raw.tgl || raw.Process_date),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'approver',
    pendingRole: 'Approver',
    deepLink: `/sertifikat-bagian?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
  };
}

async function scanSertifikatBagianPending(rawSearch) {
  const search = buildLikeSearch(rawSearch);
  const replacements = {};
  let where = `
    WHERE NOT EXISTS (
      SELECT 1 FROM T_Kalibrasi_Sertifikat_Bagian_Status AS S
      WHERE S.QA_ID = A.QA_ID
        AND S.ID_No_Sertifikat = A.ID_No_Sertifikat
        AND S.Approver_No = 1
    )
  `;

  if (search) {
    where += `
      AND (
        A.QA_ID LIKE :search
        OR A.ID_No_Sertifikat LIKE :search
        OR A.Assm_nama_instrumen LIKE :search
      )
    `;
    replacements.search = search;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.ID_No_Sertifikat,
      A.Assm_nama_instrumen,
      A.Tgl_kalibrasi,
      A.UserID,
      A.tgl
    FROM T_Kalibrasi_Sertifikat_Bagian AS A
    ${where}
    ORDER BY A.tgl DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeSertifikatBagianRow(raw));
}

// =============================================================================
// DA THERMO & SERTIFIKAT THERMO
// =============================================================================

function normalizeDaThermoRow(raw) {
  const qaId = normalizeValue(raw.QA_ID);
  return {
    module: 'da-thermo',
    moduleDisplayName: 'DA Thermo',
    sessionId: qaId,
    qaId,
    idNoSertifikat: '',
    instrumentName: normalizeValue(raw.Assm_nama_instrumen),
    calibrationDate: normalizeDate(raw.Tgl_kalibrasi),
    requester: normalizeValue(raw.UserID),
    updatedAt: normalizeDate(raw.Process_date),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'approver',
    pendingRole: 'Approver',
    deepLink: `/da-thermo?qa_id=${encodeURIComponent(qaId)}`,
  };
}

async function scanDaThermoPending(rawSearch) {
  const search = buildLikeSearch(rawSearch);
  const replacements = {};
  let where = `
    WHERE NOT EXISTS (
      SELECT 1 FROM T_Kalibrasi_DA_Thermohygro_status AS S
      WHERE S.QA_ID = A.QA_ID AND S.Approver_No = 1
    )
  `;

  if (search) {
    where += `
      AND (
        A.QA_ID LIKE :search
        OR A.Assm_nama_instrumen LIKE :search
        OR A.Assm_No_identitas_kalibrasi LIKE :search
      )
    `;
    replacements.search = search;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.Assm_nama_instrumen,
      A.Assm_No_identitas_kalibrasi,
      A.Tgl_kalibrasi,
      A.UserID,
      A.Process_date
    FROM T_Kalibrasi_DA_Thermohygro AS A
    ${where}
    ORDER BY A.Process_date DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeDaThermoRow(raw));
}

function normalizeSertifikatThermoRow(raw) {
  const qaId = normalizeValue(raw.QA_ID);
  const idNoSertifikat = normalizeValue(raw.ID_No_Sertifikat);
  return {
    module: 'sertifikat-thermo',
    moduleDisplayName: 'Sertifikat Thermo',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    instrumentName: normalizeValue(raw.Assm_nama_instrumen),
    calibrationDate: normalizeDate(raw.Tgl_kalibrasi),
    requester: normalizeValue(raw.UserID),
    updatedAt: normalizeDate(raw.tgl || raw.Process_date),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'approver',
    pendingRole: 'Approver',
    deepLink: `/sertifikat-thermo?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
  };
}

async function scanSertifikatThermoPending(rawSearch) {
  const search = buildLikeSearch(rawSearch);
  const replacements = {};
  let where = `
    WHERE NULLIF(LTRIM(RTRIM(A.QA_ID)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(A.ID_No_Sertifikat)), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM T_Kalibrasi_Sertifikat_Thermohygro_Status AS S
        WHERE S.QA_ID = A.QA_ID
          AND S.ID_No_Sertifikat = A.ID_No_Sertifikat
          AND S.Approver_No = 1
      )
  `;

  if (search) {
    where += `
      AND (
        A.QA_ID LIKE :search
        OR A.ID_No_Sertifikat LIKE :search
        OR A.Assm_nama_instrumen LIKE :search
        OR A.Assm_No_identitas_kalibrasi LIKE :search
      )
    `;
    replacements.search = search;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.ID_No_Sertifikat,
      A.Assm_nama_instrumen,
      A.Assm_No_identitas_kalibrasi,
      A.Tgl_kalibrasi,
      A.UserID,
      A.tgl,
      A.Process_date
    FROM T_Kalibrasi_Sertifikat_Thermohygro AS A
    ${where}
    ORDER BY A.tgl DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeSertifikatThermoRow(raw));
}

async function hasAllowInputPermission(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isActive = 1
      AND Appr_ApplicationCode IN ('KAL_Allow_Input')
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function isDaBagianApproverLevel1(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = 'KAL_DA_Bagian'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function isSertifikatBagianApproverLevel1(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = 'KAL_Sert_Bagian'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function isDaThermoApproverLevel1(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = 'KAL_DA_Thermo'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function isSertifikatThermoApproverLevel1(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode LIKE 'KAL_Sert_Thermo'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function getApproverIdentity(userId, applicationCode) {
  const results = await sequelizeMSQL.query(
    `
      SELECT TOP 1 Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :applicationCode
        AND Appr_ID = :userId
        AND Appr_No = 1
    `,
    {
      replacements: { userId, applicationCode },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return results.length > 0 ? results[0].Appr_Identity : 0;
}

async function approveDaThermoFromPending(qaId, user) {
  const userId = user?.user_id || user?.log_NIK || '';
  const delegatedTo = user?.delegated_to || userId;

  if (!qaId) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isDaThermoApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_DA_Thermo level 1');
    err.statusCode = 403;
    throw err;
  }

  const approvalResult = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qaId
        AND Approver_No = 1
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approvalResult[0]?.jumRow || 0) > 0) {
    const err = new Error('Tidak bisa simpan, karena data sudah approve!');
    err.statusCode = 400;
    throw err;
  }

  const approverIdentity = await getApproverIdentity(userId, 'KAL_DA_Thermo');

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_DA_Thermohygro_status
        (QA_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, 1, 0, :approverIdentity, GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: { qaId, approverIdentity, userId, delegatedTo },
      type: Sequelize.QueryTypes.INSERT,
    }
  );

  return {
    module: 'da-thermo',
    sessionId: qaId,
    qaId,
    approvedBy: 'approver',
    approvedByLabel: 'Approver',
  };
}

async function rejectDaThermoFromPending(qaId, user) {
  const userId = user?.user_id || user?.log_NIK || '';

  if (!qaId) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isDaThermoApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_DA_Thermo level 1');
    err.statusCode = 403;
    throw err;
  }

  const approvalResult = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qaId
        AND Approver_No = 1
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approvalResult[0]?.jumRow || 0) === 0) {
    const err = new Error('Tidak bisa reject karena belum approve!');
    err.statusCode = 400;
    throw err;
  }

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qaId
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  return {
    module: 'da-thermo',
    sessionId: qaId,
    qaId,
    rejectedBy: userId,
    rejectedReason: '',
  };
}

async function approveSertifikatThermoFromPending(qaId, idNoSertifikat, user) {
  const userId = user?.user_id || user?.log_NIK || '';
  const delegatedTo = user?.delegated_to || userId;

  if (!qaId || !idNoSertifikat) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isSertifikatThermoApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Sert_Thermo level 1');
    err.statusCode = 403;
    throw err;
  }

  const tglResults = await sequelizeMSQL.query(
    `
      SELECT Tgl_kalibrasi, Interval
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (tglResults.length === 0 || !tglResults[0].Tgl_kalibrasi) {
    const err = new Error('Belum simpan tanggal kalibrasi, save tanggal');
    err.statusCode = 400;
    throw err;
  }

  if (!tglResults[0].Interval) {
    const err = new Error('Harap isi interval');
    err.statusCode = 400;
    throw err;
  }

  const approvalResult = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approvalResult[0]?.jumRow || 0) > 0) {
    const err = new Error('Tidak bisa update sertifikat karena sudah approve');
    err.statusCode = 400;
    throw err;
  }

  const approverIdentity = await getApproverIdentity(userId, 'KAL_Sert_Thermo');

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, :idNoSertifikat, 1, 0, :approverIdentity, GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        approverIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
    }
  );

  return {
    module: 'sertifikat-thermo',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    approvedBy: 'approver',
    approvedByLabel: 'Approver',
  };
}

async function rejectSertifikatThermoFromPending(qaId, idNoSertifikat, user) {
  const userId = user?.user_id || user?.log_NIK || '';

  if (!qaId || !idNoSertifikat) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isSertifikatThermoApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Sert_Thermo level 1');
    err.statusCode = 403;
    throw err;
  }

  const approvalResult = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approvalResult[0]?.jumRow || 0) === 0) {
    const err = new Error('Tidak bisa reject, data belum approve');
    err.statusCode = 400;
    throw err;
  }

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  return {
    module: 'sertifikat-thermo',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    rejectedBy: userId,
    rejectedReason: '',
  };
}

async function approveDaBagianFromPending(qaId, user) {
  const userId = user?.user_id || user?.log_NIK || '';
  const delegatedTo = user?.delegated_to || userId;

  const [hasInputPermission, isApprover] = await Promise.all([
    hasAllowInputPermission(userId),
    isDaBagianApproverLevel1(userId),
  ]);

  if (!hasInputPermission) {
    const err = new Error('User tidak memiliki akses input data');
    err.statusCode = 403;
    throw err;
  }

  if (!isApprover) {
    const err = new Error('User bukan approver KAL_DA_Bagian level 1');
    err.statusCode = 403;
    throw err;
  }

  if (!qaId || qaId === '') {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const approvedResults = await sequelizeMSQL.query(
    `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qaId
        AND Approver_No = 1
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (approvedResults.length > 0) {
    const err = new Error('Tidak bisa simpan, karena data sudah approve!');
    err.statusCode = 400;
    throw err;
  }

  const approverResults = await sequelizeMSQL.query(
    `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Bagian'
        AND Appr_ID = :userId
        AND Appr_No = 1
    `,
    {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  const apprIdent = approverResults.length > 0 ? approverResults[0].Appr_Identity : '0';

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_DA_Bagian_status (
        QA_ID,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES (
        :qaId,
        1,
        0,
        :approverIdentity,
        GETDATE(),
        :userId,
        :delegatedTo,
        NULL
      )
    `,
    {
      replacements: {
        qaId,
        approverIdentity: apprIdent,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
    }
  );

  return {
    module: 'da-bagian',
    sessionId: qaId,
    qaId,
    approvedBy: 'approver',
    approvedByLabel: 'Approver',
  };
}

async function rejectDaBagianFromPending(qaId, user) {
  const userId = user?.user_id || user?.log_NIK || '';

  const [hasInputPermission, isApprover] = await Promise.all([
    hasAllowInputPermission(userId),
    isDaBagianApproverLevel1(userId),
  ]);

  if (!hasInputPermission) {
    const err = new Error('User tidak memiliki akses input data');
    err.statusCode = 403;
    throw err;
  }

  if (!isApprover) {
    const err = new Error('User bukan approver KAL_DA_Bagian level 1');
    err.statusCode = 403;
    throw err;
  }

  if (!qaId || qaId === '') {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const approvedResults = await sequelizeMSQL.query(
    `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qaId
        AND Approver_No = 1
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (approvedResults.length === 0) {
    const err = new Error('Tidak bisa reject karena belum approve!');
    err.statusCode = 400;
    throw err;
  }

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qaId
    `,
    {
      replacements: { qaId },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  return {
    module: 'da-bagian',
    sessionId: qaId,
    qaId,
    rejectedBy: userId,
    rejectedReason: '',
  };
}

async function approveSertifikatBagianFromPending(qaId, idNoSertifikat, user) {
  const userId = user?.user_id || user?.log_NIK || '';
  const delegatedTo = user?.delegated_to || userId;

  if (!qaId || !idNoSertifikat) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isSertifikatBagianApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Sert_Bagian level 1');
    err.statusCode = 403;
    throw err;
  }

  const tglResults = await sequelizeMSQL.query(
    `
      SELECT Tgl_kalibrasi, Interval
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (tglResults.length === 0 || !tglResults[0].Tgl_kalibrasi) {
    const err = new Error('Belum simpan tanggal kalibrasi, save tanggal');
    err.statusCode = 400;
    throw err;
  }

  if (!tglResults[0].Interval) {
    const err = new Error('Harap isi interval');
    err.statusCode = 400;
    throw err;
  }

  const approveResults = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approveResults[0]?.jumRow || 0) > 0) {
    const err = new Error('Tidak bisa update sertifikat karena sudah approve');
    err.statusCode = 400;
    throw err;
  }

  const identityResults = await sequelizeMSQL.query(
    `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Bagian'
        AND Appr_ID = :userId
        AND Appr_No = 1
    `,
    {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qaId, :idNoSertifikat, 1, 0, :apprIdentity, GETDATE(), :userId, :delegatedTo, NULL)
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        apprIdentity,
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.INSERT,
    }
  );

  return {
    module: 'sertifikat-bagian',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    approvedBy: 'approver',
    approvedByLabel: 'Approver',
  };
}

async function rejectSertifikatBagianFromPending(qaId, idNoSertifikat, user) {
  const userId = user?.user_id || user?.log_NIK || '';

  if (!qaId || !idNoSertifikat) {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isSertifikatBagianApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Sert_Bagian level 1');
    err.statusCode = 403;
    throw err;
  }

  const approveResults = await sequelizeMSQL.query(
    `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if ((approveResults[0]?.jumRow || 0) === 0) {
    const err = new Error('Tidak bisa reject, data belum approve');
    err.statusCode = 400;
    throw err;
  }

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  return {
    module: 'sertifikat-bagian',
    sessionId: `${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    rejectedBy: userId,
    rejectedReason: '',
  };
}

// =============================================================================
// KALIBRASI EKSTERNAL
// =============================================================================

function normalizeKalibrasiEksternalRow(raw) {
  const qaId = normalizeValue(raw.QA_ID);
  const ekstId = normalizeValue(raw.ekst_id);
  const scheduleDetailId = normalizeValue(raw.schedule_detail_id);
  return {
    module: 'kalibrasi-eksternal',
    moduleDisplayName: 'Kalibrasi Eksternal',
    sessionId: ekstId,
    scheduleDetailId,
    qaId,
    idNoSertifikat: '',
    instrumentName: normalizeValue(raw.Instrument_Name),
    calibrationDate: normalizeDate(raw.Due_Date),
    requester: normalizeValue(raw.created_by),
    updatedAt: normalizeDate(raw.updated_date || raw.created_date),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'approver',
    pendingRole: 'Approver',
    deepLink: `/kalibrasi-eksternal?schedule_detail_id=${encodeURIComponent(scheduleDetailId)}`,
  };
}

async function scanKalibrasiEksternalPending(rawSearch, bagianUser) {
  const search = buildLikeSearch(rawSearch);
  const replacements = {};
  let where = `
    WHERE e.status IN ('UPLOADED', 'TIDAK_DAPAT')
      AND NOT EXISTS (
        SELECT 1 FROM T_Kalibrasi_Eksternal_Status AS s
        WHERE s.ekst_id = e.ekst_id AND s.approver_no = 1
      )
  `;

  const bagian = String(bagianUser || '').trim();
  if (bagian && bagian.toUpperCase() !== 'VN') {
    where += ' AND d.Department = :bagianUser';
    replacements.bagianUser = bagian;
  }

  if (search) {
    where += `
      AND (
        d.QA_ID LIKE :search
        OR d.Instrument_Name LIKE :search
        OR CAST(e.ekst_id AS NVARCHAR(50)) LIKE :search
      )
    `;
    replacements.search = search;
  }

  const query = `
    SELECT TOP 200
      e.ekst_id,
      e.schedule_detail_id,
      d.QA_ID,
      d.Instrument_Name,
      d.Due_Date,
      e.created_by,
      e.created_date,
      e.updated_date
    FROM T_Kalibrasi_Eksternal AS e
    INNER JOIN T_Monthly_Schedule_External_Detail AS d
      ON d.Schedule_External_Detail_ID = e.schedule_detail_id
    ${where}
    ORDER BY e.updated_date DESC, e.created_date DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeKalibrasiEksternalRow(raw));
}

async function isKalibrasiEksternalApproverLevel1(userId) {
  const query = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = 'KAL_Eksternal'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;
  const results = await sequelizeMSQL.query(query, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  return Number(results[0].jumRow) > 0;
}

async function approveKalibrasiEksternalFromPending(ekstId, user) {
  const userId = user?.user_id || user?.log_NIK || '';
  const namaUser = user?.nama_user || userId;

  if (!ekstId || ekstId === '') {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isKalibrasiEksternalApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Eksternal level 1');
    err.statusCode = 403;
    throw err;
  }

  const statusResults = await sequelizeMSQL.query(
    `
      SELECT status
      FROM T_Kalibrasi_Eksternal
      WHERE ekst_id = :ekstId
    `,
    {
      replacements: { ekstId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (statusResults.length === 0) {
    const err = new Error('Data Kalibrasi Eksternal tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = statusResults[0].status;
  if (!['UPLOADED', 'TIDAK_DAPAT'].includes(currentStatus)) {
    const err = new Error('Data tidak dalam status yang dapat di-approve');
    err.statusCode = 400;
    throw err;
  }

  const newMainStatus = currentStatus === 'UPLOADED' ? 'APPROVED' : 'TIDAK_DAPAT_APPROVED';

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_Eksternal_Status
      WHERE ekst_id = :ekstId AND approver_no = 1
    `,
    {
      replacements: { ekstId },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Eksternal_Status (
        ekst_id,
        approver_no,
        USER_ID,
        nama_approver,
        status,
        process_date,
        created_by,
        created_date
      )
      VALUES (
        :ekstId,
        1,
        :userId,
        :namaUser,
        'APPROVE',
        GETDATE(),
        :userId,
        GETDATE()
      )
    `,
    {
      replacements: { ekstId, userId, namaUser },
      type: Sequelize.QueryTypes.INSERT,
    }
  );

  await sequelizeMSQL.query(
    `
      UPDATE T_Kalibrasi_Eksternal
      SET status = :newStatus,
          updated_by = :userId,
          updated_date = GETDATE()
      WHERE ekst_id = :ekstId
    `,
    {
      replacements: { ekstId, newStatus: newMainStatus, userId },
      type: Sequelize.QueryTypes.UPDATE,
    }
  );

  return {
    module: 'kalibrasi-eksternal',
    sessionId: ekstId,
    approvedBy: 'approver',
    approvedByLabel: 'Approver',
  };
}

async function rejectKalibrasiEksternalFromPending(ekstId, user, reason) {
  const userId = user?.user_id || user?.log_NIK || '';

  if (!ekstId || ekstId === '') {
    const err = new Error('Data belum di pilih');
    err.statusCode = 400;
    throw err;
  }

  const isApprover = await isKalibrasiEksternalApproverLevel1(userId);
  if (!isApprover) {
    const err = new Error('User bukan approver KAL_Eksternal level 1');
    err.statusCode = 403;
    throw err;
  }

  const statusResults = await sequelizeMSQL.query(
    `
      SELECT status
      FROM T_Kalibrasi_Eksternal
      WHERE ekst_id = :ekstId
    `,
    {
      replacements: { ekstId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (statusResults.length === 0) {
    const err = new Error('Data Kalibrasi Eksternal tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }

  const currentStatus = statusResults[0].status;
  if (!['UPLOADED', 'TIDAK_DAPAT'].includes(currentStatus)) {
    const err = new Error('Data tidak dalam status yang dapat di-reject');
    err.statusCode = 400;
    throw err;
  }

  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_Eksternal_Status
      WHERE ekst_id = :ekstId AND approver_no = 1
    `,
    {
      replacements: { ekstId },
      type: Sequelize.QueryTypes.DELETE,
    }
  );

  if (currentStatus === 'UPLOADED') {
    await sequelizeMSQL.query(
      `
        UPDATE T_Kalibrasi_Eksternal
        SET status = 'REJECTED',
            updated_by = :userId,
            updated_date = GETDATE()
        WHERE ekst_id = :ekstId
      `,
      {
        replacements: { ekstId, userId },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  return {
    module: 'kalibrasi-eksternal',
    sessionId: ekstId,
    rejectedBy: userId,
    rejectedReason: reason || '',
  };
}

async function listPendingApprovals(options = {}) {
  const {
    userJobLevel,
    bagian_user,
    moduleFilter,
    search,
    limit = 200,
  } = options;

  const userRole = getWorkbookApprovalRole(userJobLevel);
  const targetLevel = userRole ? userRole.key : null;
  const moduleKey = String(moduleFilter || '').toLowerCase();

  const includeWorkbook = !moduleFilter || MODULE_REGISTRY[moduleKey];
  const includeDaBagian = !moduleFilter || moduleKey === 'da-bagian';
  const includeSertifikatBagian = !moduleFilter || moduleKey === 'sertifikat-bagian';
  const includeDaThermo = !moduleFilter || moduleKey === 'da-thermo';
  const includeSertifikatThermo = !moduleFilter || moduleKey === 'sertifikat-thermo';
  const includeKalibrasiEksternal = !moduleFilter || moduleKey === 'kalibrasi-eksternal';

  if (
    moduleFilter
    && !includeWorkbook
    && !includeDaBagian
    && !includeSertifikatBagian
    && !includeDaThermo
    && !includeSertifikatThermo
    && !includeKalibrasiEksternal
  ) {
    const error = new Error(`Unknown calibration module: ${moduleFilter}`);
    error.statusCode = 400;
    throw error;
  }

  const results = [];

  if (includeWorkbook) {
    const modulesToScan = moduleFilter
      ? [{ key: moduleKey, config: MODULE_REGISTRY[moduleKey] }]
      : moduleKeys().map((key) => ({ key, config: MODULE_REGISTRY[key] }));

    for (const { key, config } of modulesToScan) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const rows = await scanModule(config, { search });
        for (const raw of rows) {
          const normalized = normalizeRow(config, key, raw);
          if (!targetLevel || normalized.pendingLevel === targetLevel) {
            results.push(normalized);
          }
        }
      } catch (err) {
        // Log and continue so one broken module does not block the whole page.
        console.error(`[pendingCalibrationApprovals] scan failed for ${key}:`, err.message);
      }
    }
  }

  if (includeDaBagian) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanDaBagianPending(search);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for da-bagian:', err.message);
    }
  }

  if (includeSertifikatBagian) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanSertifikatBagianPending(search);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for sertifikat-bagian:', err.message);
    }
  }

  if (includeDaThermo) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanDaThermoPending(search);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for da-thermo:', err.message);
    }
  }

  if (includeSertifikatThermo) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanSertifikatThermoPending(search);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for sertifikat-thermo:', err.message);
    }
  }

  if (includeKalibrasiEksternal) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanKalibrasiEksternalPending(search, bagian_user);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for kalibrasi-eksternal:', err.message);
    }
  }

  results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return results.slice(0, limit);
}

async function getSessionById(config, sessionId) {
  const ac = config.approvalColumns;
  await assertTableAndColumns(config);
  const request = await createRequest();
  const result = await request
    .input('SessionId', sessionId)
    .query(`
      SELECT TOP 1
        ${columnExpression(config.idColumn)} AS id,
        ${columnOrNull(config.qaIdColumn, 'qaId')},
        ${columnOrNull(config.idNoSertifikatColumn, 'idNoSertifikat')},
        ${columnOrNull(config.instrumentNameColumn, 'instrumentName')},
        ${columnExpression(ac.admin)} AS approved_by_admin,
        ${columnExpression(ac.adminDate)} AS approved_by_admin_date,
        ${columnExpression(ac.officer)} AS approved_by_officer,
        ${columnExpression(ac.officerDate)} AS approved_by_officer_date,
        ${columnExpression(ac.manager)} AS approved_by_manager,
        ${columnExpression(ac.managerDate)} AS approved_by_manager_date
      FROM ${config.table} AS S
      ${config.detailApply || ''}
      WHERE ${columnExpression(config.idColumn)} = @SessionId
    `);
  return result.recordset[0] || null;
}

async function approveSession(module, sessionId, user) {
  if (isBagianModule(module)) {
    const moduleKey = String(module).toLowerCase();
    if (moduleKey === 'da-bagian') {
      return approveDaBagianFromPending(sessionId, user);
    }
    if (moduleKey === 'da-thermo') {
      return approveDaThermoFromPending(sessionId, user);
    }
    if (moduleKey === 'kalibrasi-eksternal') {
      return approveKalibrasiEksternalFromPending(sessionId, user);
    }
    const [qaId, idNoSertifikat] = String(sessionId).split('~');
    if (moduleKey === 'sertifikat-thermo') {
      return approveSertifikatThermoFromPending(qaId, idNoSertifikat, user);
    }
    return approveSertifikatBagianFromPending(qaId, idNoSertifikat, user);
  }

  const { key, config } = parseModule(module);
  const ac = config.approvalColumns;
  const jobLevel = Number(
    user?.joblevel_id_user ?? user?.job_level_id ?? user?.Job_LevelID
  );
  const userId = user?.user_id || user?.log_NIK || '';
  const role = getWorkbookApprovalRole(jobLevel);

  if (!role) {
    const err = new Error(`User tidak memiliki role approval workbook (job level terdeteksi: ${jobLevel || '-'}).`);
    err.statusCode = 403;
    throw err;
  }

  const session = await getSessionById(config, sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  const normalizedSession = {
    approvedByAdmin: session.approved_by_admin,
    approvedByOfficer: session.approved_by_officer,
    approvedByManager: session.approved_by_manager,
  };

  const orderMessage = assertApprovalOrder(normalizedSession, role);
  if (orderMessage) {
    const err = new Error(orderMessage);
    err.statusCode = 403;
    throw err;
  }

  const pendingRole = getPendingRole(normalizedSession);
  const request = await createRequest();
  await request
    .input('UserId', userId)
    .input('SessionId', sessionId)
    .query(`
      UPDATE ${config.table}
      SET
        ${ac[pendingRole.key]} = @UserId,
        ${ac[`${pendingRole.key}Date`]} = GETDATE()
        ${config.conforming ? `, ${config.statusColumn} = '${pendingRole.status}'` : ''}
      WHERE ${config.idColumn} = @SessionId
    `);

  return {
    module: key,
    sessionId,
    approvedBy: pendingRole.key,
    approvedByLabel: pendingRole.label,
  };
}

async function rejectSession(module, sessionId, user, reason) {
  if (isBagianModule(module)) {
    const moduleKey = String(module).toLowerCase();
    if (moduleKey === 'da-bagian') {
      return rejectDaBagianFromPending(sessionId, user);
    }
    if (moduleKey === 'da-thermo') {
      return rejectDaThermoFromPending(sessionId, user);
    }
    if (moduleKey === 'kalibrasi-eksternal') {
      return rejectKalibrasiEksternalFromPending(sessionId, user, reason);
    }
    const [qaId, idNoSertifikat] = String(sessionId).split('~');
    if (moduleKey === 'sertifikat-thermo') {
      return rejectSertifikatThermoFromPending(qaId, idNoSertifikat, user);
    }
    return rejectSertifikatBagianFromPending(qaId, idNoSertifikat, user);
  }

  const { key, config } = parseModule(module);
  const ac = config.approvalColumns;
  const userId = user?.user_id || user?.log_NIK || '';

  const session = await getSessionById(config, sessionId);
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  // Clear all approval flags and record who rejected and why.
  const request = await createRequest();
  await request
    .input('SessionId', sessionId)
    .input('RejectedBy', userId)
    .input('RejectedReason', reason || '')
    .query(`
      UPDATE ${config.table}
      SET
        ${ac.admin} = NULL,
        ${ac.adminDate} = NULL,
        ${ac.officer} = NULL,
        ${ac.officerDate} = NULL,
        ${ac.manager} = NULL,
        ${ac.managerDate} = NULL,
        ${ac.rejectedBy} = @RejectedBy,
        ${ac.rejectedReason} = @RejectedReason,
        ${ac.rejectedAt} = GETDATE()
        ${config.conforming ? `, ${config.statusColumn} = 'REJECTED'` : ''}
      WHERE ${config.idColumn} = @SessionId
    `);

  return {
    module: key,
    sessionId,
    rejectedBy: userId,
    rejectedReason: reason || '',
  };
}

module.exports = {
  moduleKeys,
  getWorkbookApprovalRole,
  listPendingApprovals,
  approveSession,
  rejectSession,
};
