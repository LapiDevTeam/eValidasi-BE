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
const {
  publishSessionToSertifikatBagian,
} = require('../src/services/calibrationCalculation.service');
const {
  publishToSertifikat: publishDisintegrationSertifikat,
} = require('../src/services/disintegrationCalculation.service');
const {
  publishToSertifikat: publishRpmSertifikat,
} = require('../src/services/rpmCalculation.service');
const {
  publishToSertifikat: publishTimerSertifikat,
} = require('../src/services/timerCalculation.service');
const {
  publishToSertifikat: publishTemperatureSertifikat,
} = require('../src/services/temperatureCalculation.service');
const {
  publishToSertifikat: publishTappedVolumeterSertifikat,
} = require('../src/services/tappedVolumeterCalculation.service');
const {
  publishToSertifikat: publishTimbanganSertifikat,
} = require('../src/services/timbanganCalculation.service');
const {
  finalizeManagerCalibrationApproval,
} = require('./calibrationManagerFinalization.service');
const labelReprintRequestsController = require('../controllers/transactions/label-reprint-requests.controller');

// Label Reprint requests use a single-step Manager approval (not the
// Admin->Officer->Manager hierarchy below), and reuse the same 7 module keys
// as their source modules. Namespaced with this prefix so they don't collide
// with the (currently disabled) BAGIAN_MODULES session-approval dispatch for
// those same 7 keys — see approveSession/rejectSession.
const LABEL_REPRINT_MODULE_PREFIX = 'label-reprint-';
const LEGACY_LABEL_REPRINT_MODULE_PREFIX = 'label-reprint:';

const LABEL_REPRINT_MODULES = {
  'sertifikat-thermo': { displayName: 'Sertifikat Thermo — Reprint Label', deepLinkPath: '/sertifikat-thermo' },
  'sertifikat-timbangan': { displayName: 'Sertifikat Timbangan — Reprint Label', deepLinkPath: '/sertifikat-timbangan' },
  'sertifikat-bagian': { displayName: 'Sertifikat Bagian — Reprint Label', deepLinkPath: '/sertifikat-bagian' },
  'da-thermo': { displayName: 'DA Thermo — Reprint Label', deepLinkPath: '/da-thermo' },
  'da-anak-timbangan': { displayName: 'DA Anak Timbangan — Reprint Label', deepLinkPath: '/anak-timbangan' },
  'da-timbangan-massa': { displayName: 'DA Timbangan Massa — Reprint Label', deepLinkPath: '/da-timbangan' },
  'da-bagian': { displayName: 'DA Bagian — Reprint Label', deepLinkPath: '/da-bagian' },
};

function getLabelReprintSourceModule(module) {
  const moduleKey = String(module || '').toLowerCase();
  if (moduleKey.startsWith(LABEL_REPRINT_MODULE_PREFIX)) {
    return moduleKey.slice(LABEL_REPRINT_MODULE_PREFIX.length);
  }
  if (moduleKey.startsWith(LEGACY_LABEL_REPRINT_MODULE_PREFIX)) {
    return moduleKey.slice(LEGACY_LABEL_REPRINT_MODULE_PREFIX.length);
  }
  return '';
}

function isLabelReprintModule(module) {
  return Boolean(getLabelReprintSourceModule(module));
}

function normalizeLabelReprintRow(raw) {
  const sourceModule = raw.module;
  const meta = LABEL_REPRINT_MODULES[sourceModule] || {};
  const qaId = normalizeValue(raw.qa_id);
  const idNoSertifikat = normalizeValue(raw.id_no_sertifikat);
  const baseDisplayName = meta.displayName || `Reprint Label`;
  return {
    module: `${LABEL_REPRINT_MODULE_PREFIX}${sourceModule}`,
    moduleDisplayName: raw.is_manual ? `${baseDisplayName}` : baseDisplayName,
    sessionId: String(raw.request_id),
    qaId,
    idNoSertifikat,
    instrumentName: normalizeValue(raw.instrument_name),
    calibrationDate: '',
    requester: normalizeValue(raw.requested_by),
    updatedAt: normalizeDate(raw.requested_at),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'manager',
    pendingRole: 'Manager',
    reprintRemark: normalizeValue(raw.reprint_remark),
    isManual: Boolean(raw.is_manual),
    deepLink: meta.deepLinkPath
      ? `${meta.deepLinkPath}?qa_id=${encodeURIComponent(qaId)}${idNoSertifikat ? `&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}` : ''}`
      : '',
  };
}

async function scanLabelReprintPending(filters = {}) {
  const { search, requester, sourceModule } = filters;
  const searchLike = buildLikeSearch(search);
  const requesterLike = buildLikeSearch(requester);

  const conditions = [`status = 'PENDING'`];
  const replacements = {};
  if (sourceModule) {
    conditions.push('module = :sourceModule');
    replacements.sourceModule = sourceModule;
  }
  if (searchLike) {
    conditions.push('(qa_id LIKE :search OR instrument_name LIKE :search)');
    replacements.search = searchLike;
  }
  if (requesterLike) {
    conditions.push('requested_by LIKE :requester');
    replacements.requester = requesterLike;
  }

  const rows = await sequelizeMSQL.query(`
    SELECT TOP 200 *
    FROM label_reprint_requests
    WHERE ${conditions.join(' AND ')}
    ORDER BY requested_at DESC
  `, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map(normalizeLabelReprintRow);
}

// Modules that use the same approve-manager-then-auto-publish-certificate
// pattern (most share the "Bagian" certificate tables; Timbangan has its own
// dedicated T_Kalibrasi_Sertifikat_Timbangan tables but the same gap).
const FINAL_APPROVAL_PUBLISH_HANDLERS = {
  'calibration-workbook': publishSessionToSertifikatBagian,
  disintegration: publishDisintegrationSertifikat,
  rpm: publishRpmSertifikat,
  timer: publishTimerSertifikat,
  temperature: publishTemperatureSertifikat,
  'tapped-volumeter': publishTappedVolumeterSertifikat,
  timbangan: publishTimbanganSertifikat,
};

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

// Modules removed from the pending-approval oversight list by request.
// Approval/reject endpoints remain available for direct links.
const EXCLUDED_PENDING_MODULES = new Set([
  'da-bagian',
  'sertifikat-bagian',
  'da-thermo',
  'sertifikat-thermo',
  'timbangan',
]);

const MASTER_APPROVAL_MODULES = new Set([
  'master-awp',
  'master-map-internal',
  'master-map-external',
]);

const MASTER_APPROVAL_CONFIGS = {
  'master-awp': {
    displayName: 'Master AWP',
    table: 'dbo.T_AWP_Header',
    idColumn: 'AWP_ID',
    yearColumn: 'Year',
    monthColumn: null,
    statusColumn: 'Status',
    workflowColumn: 'Workflow_View',
    revisionColumn: 'Revision_No',
    requestedByColumn: 'Requested_By',
    requestedAtColumn: 'Requested_At',
    preparedByColumn: 'Prepared_By',
    preparedByNameColumn: 'Prepared_By_Name',
    approvedByColumn: 'Approved_By',
    approvedByNameColumn: 'Approved_By_Name',
    approvedByTitleColumn: 'Approved_By_Title',
    approvedDateColumn: 'Approved_At',
    rejectedByColumn: 'Rejected_By',
    rejectedDateColumn: 'Rejected_At',
    notesColumn: 'Notes',
    createdByColumn: 'Created_By',
    createdDateColumn: 'Created_At',
    updatedByColumn: 'Updated_By',
    updatedDateColumn: 'Updated_At',
    lockedColumn: null,
    planWorkflow: 'start',
    realizationWorkflow: 'end',
    planRoute: '/master-rkt-template',
    realizationRoute: '/master-rkt',
  },
  'master-map-internal': {
    displayName: 'Master MAP Internal',
    table: 'dbo.T_Monthly_Schedule_Header',
    idColumn: 'Schedule_Header_ID',
    yearColumn: 'Period_Year',
    monthColumn: 'Period_Month',
    statusColumn: 'Status',
    workflowColumn: 'Workflow_View',
    revisionColumn: 'Revision_No',
    requestedByColumn: 'Requested_By',
    requestedAtColumn: 'Requested_Date',
    preparedByColumn: 'Prepared_By',
    preparedByNameColumn: 'Prepared_By_Name',
    approvedByColumn: 'Approved_By',
    approvedByNameColumn: 'Approved_By_Name',
    approvedByTitleColumn: 'Approved_By_Title',
    approvedDateColumn: 'Approved_Date',
    rejectedByColumn: 'Rejected_By',
    rejectedDateColumn: 'Rejected_Date',
    notesColumn: 'Remarks',
    createdByColumn: 'Created_By',
    createdDateColumn: 'Created_Date',
    updatedByColumn: 'Updated_By',
    updatedDateColumn: 'Updated_Date',
    lockedColumn: 'Is_Locked',
    planWorkflow: 'plan',
    realizationWorkflow: 'realization',
    planRoute: '/master-jadwal-bulanan-template',
    realizationRoute: '/master-jadwal-bulanan',
  },
  'master-map-external': {
    displayName: 'Master MAP External',
    table: 'dbo.T_Monthly_Schedule_External_Header',
    idColumn: 'Schedule_External_Header_ID',
    yearColumn: 'Base_Period_Year',
    monthColumn: 'Base_Period_Month',
    statusColumn: 'Status',
    workflowColumn: 'Workflow_View',
    revisionColumn: 'Revision_No',
    requestedByColumn: 'Requested_By',
    requestedAtColumn: 'Requested_Date',
    preparedByColumn: 'Prepared_By',
    preparedByNameColumn: 'Prepared_By_Name',
    approvedByColumn: 'Approved_By',
    approvedByNameColumn: 'Approved_By_Name',
    approvedByTitleColumn: 'Approved_By_Title',
    approvedDateColumn: 'Approved_Date',
    rejectedByColumn: 'Rejected_By',
    rejectedDateColumn: 'Rejected_Date',
    notesColumn: 'Remarks',
    createdByColumn: 'Created_By',
    createdDateColumn: 'Created_Date',
    updatedByColumn: 'Updated_By',
    updatedDateColumn: 'Updated_Date',
    lockedColumn: 'Is_Locked',
    planWorkflow: 'plan',
    realizationWorkflow: 'realization',
    planRoute: '/master-jadwal-bulanan-external-template',
    realizationRoute: '/master-jadwal-bulanan-external',
  },
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function isBagianModule(module) {
  return BAGIAN_MODULES.has(String(module || '').toLowerCase());
}

function isMasterApprovalModule(module) {
  return MASTER_APPROVAL_MODULES.has(String(module || '').toLowerCase());
}

function isExcludedFromPending(module) {
  return EXCLUDED_PENDING_MODULES.has(String(module || '').toLowerCase());
}

function canApproveRole(userRole, pendingRole) {
  if (!userRole || !pendingRole) return false;
  return userRole.rank >= pendingRole.rank;
}

const CONFORMING_APPROVAL_COLUMNS = {
  admin: 'ApprovedByAdmin',
  adminDate: 'ApprovedByAdminDate',
  officer: 'ApprovedByOfficer',
  officerDate: 'ApprovedByOfficerDate',
  manager: 'ApprovedByManager',
  managerDate: 'ApprovedByManagerDate',
  rejectedBy: 'RejectedBy',
  rejectedReason: 'RejectedReason',
  rejectedAt: 'RejectedAt',
};

const BAGIAN_CERTIFICATE_DETAIL_APPLY = `
  OUTER APPLY (
    SELECT TOP 1
      C.Assm_nama_instrumen,
      C.Tgl_kalibrasi
    FROM dbo.T_Kalibrasi_Sertifikat_Bagian AS C
    WHERE C.QA_ID = S.QA_ID
      AND C.ID_No_Sertifikat = S.ID_No_Sertifikat
  ) AS CertificateBagian
`;

function bagianWorkbookConfig({
  displayName,
  table,
  routePrefix,
}) {
  return {
    displayName,
    table,
    idColumn: 'Session_ID',
    instrumentNameColumn: 'CertificateBagian.Assm_nama_instrumen',
    calibrationDateColumn: 'CertificateBagian.Tgl_kalibrasi',
    qaIdColumn: 'QA_ID',
    idNoSertifikatColumn: 'ID_No_Sertifikat',
    userIdColumn: 'UserID',
    updateDateColumn: 'Update_Date',
    processDateColumn: 'Process_Date',
    statusColumn: 'Status',
    conforming: true,
    routePrefix,
    detailApply: BAGIAN_CERTIFICATE_DETAIL_APPLY,
    finalizationCertificateType: 'bagian',
    approvalColumns: CONFORMING_APPROVAL_COLUMNS,
  };
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
    finalizationCertificateType: 'thermo',
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
    buildDeepLink: ({ raw, qaId, idNoSertifikat, focusEvaluation }) => {
      const params = [`sessionId=${encodeURIComponent(raw.id)}`];
      if (qaId) params.push(`qa_id=${encodeURIComponent(qaId)}`);
      if (idNoSertifikat) {
        params.push(`id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`);
      }
      if (focusEvaluation) params.push('focusEvaluation=1');
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
  moisture: bagianWorkbookConfig({
    displayName: 'Moisture Analyzer',
    table: 'dbo.T_Kalibrasi_Moisture_Workbook_Session',
    routePrefix: '/moisture-calibration',
  }),
  friability: bagianWorkbookConfig({
    displayName: 'Friability Tester',
    table: 'dbo.T_Kalibrasi_Friability_Workbook_Session',
    routePrefix: '/friability-calibration',
  }),
  'dissolution-tester': bagianWorkbookConfig({
    displayName: 'Dissolution Tester',
    table: 'dbo.T_Kalibrasi_DissolutionTester_Workbook_Session',
    routePrefix: '/dissolution-tester-calibration',
  }),
  enclosures: bagianWorkbookConfig({
    displayName: 'Enclosures',
    table: 'dbo.T_Kalibrasi_Enclosures_Workbook_Session',
    routePrefix: '/enclosures-calibration',
  }),
  'hardness-tester': bagianWorkbookConfig({
    displayName: 'Hardness Tester',
    table: 'dbo.T_Kalibrasi_HardnessTester_Workbook_Session',
    routePrefix: '/hardness-tester-calibration',
  }),
  'leak-test': bagianWorkbookConfig({
    displayName: 'Leak Test',
    table: 'dbo.T_Kalibrasi_LeakTest_Workbook_Session',
    routePrefix: '/leak-test-calibration',
  }),
  'temperature-control': bagianWorkbookConfig({
    displayName: 'Temperature Control',
    table: 'dbo.T_Kalibrasi_TemperatureControl_Workbook_Session',
    routePrefix: '/temperature-control-calibration',
  }),
  'torque-meter': bagianWorkbookConfig({
    displayName: 'Torque Meter',
    table: 'dbo.T_Kalibrasi_TorqueMeter_Workbook_Session',
    routePrefix: '/torque-meter-calibration',
  }),
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

function buildConformingDeepLink(routePrefix, sessionId, qaId, idNoSertifikat, focusEvaluation) {
  const params = [];
  if (sessionId) params.push(`sessionId=${encodeURIComponent(sessionId)}`);
  if (qaId) params.push(`qa_id=${encodeURIComponent(qaId)}`);
  if (idNoSertifikat) {
    params.push(`id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`);
  }
  if (focusEvaluation) params.push('focusEvaluation=1');
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

  const requesterExpr = config.userIdColumn
    ? `dbo.fnGetInisialKaryawan(${columnExpression(config.userIdColumn)})`
    : `''`;

  const selectCols = [
    `${columnExpression(config.idColumn)} AS id`,
    columnOrNull(config.qaIdColumn, 'qaId'),
    columnOrNull(config.idNoSertifikatColumn, 'idNoSertifikat'),
    columnOrNull(config.instrumentNameColumn, 'instrumentName'),
    columnOrNull(config.calibrationDateColumn, 'calibrationDate'),
    `${requesterExpr} AS requester`,
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
      AND ${columnExpression(config.statusColumn)} IN ('CALCULATED', 'FINALIZED', 'PUBLISHED', 'APPROVED_ADMIN', 'APPROVED_OFFICER')
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

  if (filters.requester) {
    const requester = `%${filters.requester.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    request.input('Requester', requester);
    query += ` AND ${requesterExpr} LIKE @Requester`;
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
  const isWorkbookModule = !isBagianModule(moduleKey);
  const deepLink = typeof config.buildDeepLink === 'function'
    ? config.buildDeepLink({ raw, qaId, idNoSertifikat, focusEvaluation: isWorkbookModule })
    : config.conforming
      ? buildConformingDeepLink(config.routePrefix, raw.id, qaId, idNoSertifikat, isWorkbookModule)
      : `${config.routePrefix}?sessionId=${encodeURIComponent(raw.id)}${isWorkbookModule ? '&focusEvaluation=1' : ''}`;

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

function quotedColumn(columnName) {
  return `[${columnName}]`;
}

function masterColumn(existing, columnName, alias = 'H') {
  if (!columnName || !existing.has(columnName)) return 'NULL';
  return `${alias}.${quotedColumn(columnName)}`;
}

function normalizePeriodMonth(value) {
  const numberValue = Number(value);
  if (Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 12) {
    return String(numberValue).padStart(2, '0');
  }
  return normalizeValue(value);
}

function getMasterPeriodLabel(moduleKey, year, month) {
  if (moduleKey === 'master-awp') return normalizeValue(year);
  const monthNumber = Number(month);
  const monthLabel = MONTH_LABELS[monthNumber - 1] || normalizeValue(month);
  return `${monthLabel} ${normalizeValue(year)}`.trim();
}

function isMasterPlanningWorkflow(config, workflowView) {
  return normalizeValue(workflowView).toLowerCase() === config.planWorkflow;
}

function buildMasterApprovalDeepLink(moduleKey, raw) {
  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  const year = normalizeValue(raw.periodYear);
  const month = normalizePeriodMonth(raw.periodMonth);
  const route = isMasterPlanningWorkflow(config, raw.workflowView)
    ? config.planRoute
    : config.realizationRoute;
  const params = [`year=${encodeURIComponent(year)}`, 'source=requested'];
  if (month) {
    params.splice(1, 0, `month=${encodeURIComponent(Number(month) || month)}`);
  }
  return `${route}?${params.join('&')}`;
}

function getMasterRequesterExpression(existing, config) {
  const preparedName = masterColumn(existing, config.preparedByNameColumn);
  const preparedBy = masterColumn(existing, config.preparedByColumn);
  const requestedBy = masterColumn(existing, config.requestedByColumn);
  const createdBy = masterColumn(existing, config.createdByColumn);
  return `COALESCE(
    dbo.fnGetInisialKaryawan(COALESCE(${preparedBy}, ${requestedBy}, ${createdBy})),
    ${preparedBy},
    ${requestedBy},
    ${createdBy},
    ${preparedName},
    ''
  )`;
}

function getMasterRequiredColumns(config) {
  return [
    config.idColumn,
    config.yearColumn,
    config.statusColumn,
    config.workflowColumn,
    config.revisionColumn,
  ].filter(Boolean);
}

function normalizeMasterApprovalRow(moduleKey, raw) {
  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  const year = normalizeValue(raw.periodYear);
  const month = normalizePeriodMonth(raw.periodMonth);
  const isPlanning = isMasterPlanningWorkflow(config, raw.workflowView);
  const workflowLabel = isPlanning ? 'Plan' : 'Realization';
  const periodLabel = getMasterPeriodLabel(moduleKey, year, month);
  const revisionNo = normalizeValue(raw.revisionNo);

  return {
    module: moduleKey,
    moduleDisplayName: `${config.displayName} ${workflowLabel}`,
    sessionId: normalizeValue(raw.id),
    qaId: periodLabel,
    idNoSertifikat: revisionNo ? `Rev ${revisionNo}` : '',
    instrumentName: `${config.displayName} ${workflowLabel} ${periodLabel}`.trim(),
    calibrationDate: '',
    requester: normalizeValue(raw.requester),
    updatedAt: normalizeDate(raw.updatedAt || raw.requestedAt || raw.createdAt),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: '',
    approvedByOfficerDate: '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel: 'manager',
    pendingRole: 'Manager',
    deepLink: buildMasterApprovalDeepLink(moduleKey, raw),
  };
}

function getMasterUserJobLevel(user = {}) {
  return Number(
    user?.delegatedTo?.Job_LevelID ??
      user?.delegatedTo?.emp_JobLevelID ??
      user?.delegatedTo?.joblevel_id_user ??
      user?.user?.Job_LevelID ??
      user?.user?.emp_JobLevelID ??
      user?.user?.joblevel_id_user ??
      user?.Job_LevelID ??
      user?.emp_JobLevelID ??
      user?.joblevel_id_user ??
      user?.jabatan_user ??
      0
  );
}

function getMasterUserDepartments(user = {}) {
  return [
    user?.delegatedTo?.emp_DeptID,
    user?.delegatedTo?.DeptID,
    user?.delegatedTo?.emp_JobID,
    user?.delegatedTo?.emp_JobId,
    user?.delegatedTo?.emp_Job_id,
    user?.delegatedTo?.bagian_user,
    user?.user?.emp_DeptID,
    user?.user?.DeptID,
    user?.user?.emp_JobID,
    user?.user?.emp_JobId,
    user?.user?.emp_Job_id,
    user?.user?.bagian_user,
    user?.emp_DeptID,
    user?.DeptID,
    user?.emp_JobID,
    user?.emp_JobId,
    user?.emp_Job_id,
    user?.bagian_user,
  ]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean);
}

function assertMasterVNManager(user = {}) {
  if (
    getMasterUserJobLevel(user) === 3 &&
    getMasterUserDepartments(user).includes('VN')
  ) {
    return;
  }

  const err = new Error('Only VN Manager can approve or reject master planning revisions.');
  err.statusCode = 403;
  throw err;
}

function getMasterUserId(user = {}) {
  return user?.user_id || user?.log_NIK || user?.UserID || '';
}

function getMasterUserName(user = {}) {
  return String(
    user?.delegatedTo?.Nama ??
      user?.delegatedTo?.nama_user ??
      user?.user?.Nama ??
      user?.user?.nama_user ??
      user?.Nama ??
      user?.nama_user ??
      getMasterUserId(user)
  ).trim();
}

function getMasterApprovalTitle(options = {}) {
  return String(
    options?.approved_by_title ??
      options?.approvedByTitle ??
      options?.job_description ??
      options?.jobDescription ??
      ''
  ).trim();
}

async function scanMasterApprovalPending(moduleKey, filters = {}) {
  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  if (!config) return [];

  const existing = await getExistingColumns(config.table);
  const missingRequired = getMasterRequiredColumns(config).filter(
    (columnName) => !existing.has(columnName)
  );
  if (missingRequired.length > 0) {
    return [];
  }

  const idExpr = masterColumn(existing, config.idColumn);
  const yearExpr = masterColumn(existing, config.yearColumn);
  const monthExpr = masterColumn(existing, config.monthColumn);
  const workflowExpr = masterColumn(existing, config.workflowColumn);
  const revisionExpr = masterColumn(existing, config.revisionColumn);
  const requesterExpr = getMasterRequesterExpression(existing, config);
  const requestedAtExpr = masterColumn(existing, config.requestedAtColumn);
  const createdAtExpr = masterColumn(existing, config.createdDateColumn);
  const updatedAtExpr = masterColumn(existing, config.updatedDateColumn);

  const replacements = {};
  let where = `WHERE ${masterColumn(existing, config.statusColumn)} = 'REQUESTED'`;

  const search = buildLikeSearch(filters.search);
  if (search) {
    replacements.search = search;
    where += `
      AND (
        CAST(${idExpr} AS NVARCHAR(50)) LIKE :search
        OR CAST(${yearExpr} AS NVARCHAR(50)) LIKE :search
        OR CAST(${revisionExpr} AS NVARCHAR(50)) LIKE :search
        OR CAST(${workflowExpr} AS NVARCHAR(50)) LIKE :search
        OR ${requesterExpr} LIKE :search
        ${config.monthColumn ? `OR CAST(${monthExpr} AS NVARCHAR(50)) LIKE :search` : ''}
      )
    `;
  }

  const requester = buildLikeSearch(filters.requester);
  if (requester) {
    replacements.requester = requester;
    where += ` AND ${requesterExpr} LIKE :requester`;
  }

  const query = `
    SELECT TOP 200
      ${idExpr} AS id,
      CAST(${yearExpr} AS NVARCHAR(50)) AS periodYear,
      ${config.monthColumn ? `RIGHT('0' + CAST(${monthExpr} AS VARCHAR(2)), 2)` : 'NULL'} AS periodMonth,
      CAST(${workflowExpr} AS NVARCHAR(20)) AS workflowView,
      ${revisionExpr} AS revisionNo,
      ${requesterExpr} AS requester,
      ${requestedAtExpr} AS requestedAt,
      ${createdAtExpr} AS createdAt,
      ${updatedAtExpr} AS updatedAt
    FROM ${config.table} AS H
    ${where}
    ORDER BY COALESCE(${updatedAtExpr}, ${requestedAtExpr}, ${createdAtExpr}) DESC, ${idExpr} DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((row) => normalizeMasterApprovalRow(moduleKey, row));
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
    requester: normalizeValue(raw.requester),
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

async function scanDaBagianPending(rawSearch, requester) {
  const search = buildLikeSearch(rawSearch);
  const requesterLike = buildLikeSearch(requester);
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

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(A.UserID) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.Assm_nama_instrumen,
      A.Tgl_kalibrasi,
      dbo.fnGetInisialKaryawan(A.UserID) AS requester,
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
    requester: normalizeValue(raw.requester),
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

async function scanSertifikatBagianPending(rawSearch, requester) {
  const search = buildLikeSearch(rawSearch);
  const requesterLike = buildLikeSearch(requester);
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

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(A.UserID) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.ID_No_Sertifikat,
      A.Assm_nama_instrumen,
      A.Tgl_kalibrasi,
      dbo.fnGetInisialKaryawan(A.UserID) AS requester,
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
    requester: normalizeValue(raw.requester),
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

async function scanDaThermoPending(rawSearch, requester) {
  const search = buildLikeSearch(rawSearch);
  const requesterLike = buildLikeSearch(requester);
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

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(A.UserID) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.Assm_nama_instrumen,
      A.Assm_No_identitas_kalibrasi,
      A.Tgl_kalibrasi,
      dbo.fnGetInisialKaryawan(A.UserID) AS requester,
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
    requester: normalizeValue(raw.requester),
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

async function scanSertifikatThermoPending(rawSearch, requester) {
  const search = buildLikeSearch(rawSearch);
  const requesterLike = buildLikeSearch(requester);
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

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(A.UserID) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      A.QA_ID,
      A.ID_No_Sertifikat,
      A.Assm_nama_instrumen,
      A.Assm_No_identitas_kalibrasi,
      A.Tgl_kalibrasi,
      dbo.fnGetInisialKaryawan(A.UserID) AS requester,
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
  const status = String(raw.status || '').toUpperCase();
  const isTidakDapat = status === 'TIDAK_DAPAT';
  return {
    module: 'kalibrasi-eksternal',
    moduleDisplayName: isTidakDapat ? 'Unit Tidak Siap' : 'Kalibrasi Eksternal',
    sessionId: ekstId,
    scheduleDetailId,
    qaId,
    idNoSertifikat: '',
    instrumentName: normalizeValue(raw.Instrument_Name),
    calibrationDate: normalizeDate(raw.Due_Date),
    requester: normalizeValue(raw.requester),
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

async function scanKalibrasiEksternalPending(rawSearch, bagianUser, requester) {
  const search = buildLikeSearch(rawSearch);
  const requesterLike = buildLikeSearch(requester);
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

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(e.created_by) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      e.ekst_id,
      e.schedule_detail_id,
      e.status,
      d.QA_ID,
      d.Instrument_Name,
      d.Due_Date,
      dbo.fnGetInisialKaryawan(e.created_by) AS requester,
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
    const err = new Error('Data tidak dalam status yang dapat di-reject');
    err.statusCode = 400;
    throw err;
  }

  const newMainStatus = currentStatus === 'UPLOADED' ? 'REJECTED' : 'TIDAK_DAPAT_REJECTED';

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

  // Simpan jejak penolakan + alasannya supaya catatan MGR tampil di layar FA.
  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Eksternal_Status (
        ekst_id,
        approver_no,
        USER_ID,
        nama_approver,
        status,
        catatan,
        process_date,
        created_by,
        created_date
      )
      VALUES (
        :ekstId,
        1,
        :userId,
        :namaUser,
        'REJECT',
        :catatan,
        GETDATE(),
        :userId,
        GETDATE()
      )
    `,
    {
      replacements: { ekstId, userId, namaUser, catatan: (reason || '').trim() || null },
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
    rejectedBy: userId,
    rejectedReason: reason || '',
  };
}

async function getMasterApprovalHeaderById(moduleKey, sessionId, transaction) {
  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  if (!config) {
    const err = new Error(`Unknown master approval module: ${moduleKey}`);
    err.statusCode = 400;
    throw err;
  }

  const headerId = Number(sessionId);
  if (!Number.isInteger(headerId) || headerId <= 0) {
    const err = new Error('Positive numeric master header ID is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await getExistingColumns(config.table);
  const missingRequired = getMasterRequiredColumns(config).filter(
    (columnName) => !existing.has(columnName)
  );
  if (missingRequired.length > 0) {
    const err = new Error(
      `Missing required master approval columns in ${config.table}: ${missingRequired.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        ${masterColumn(existing, config.idColumn)} AS id,
        CAST(${masterColumn(existing, config.yearColumn)} AS NVARCHAR(50)) AS periodYear,
        ${config.monthColumn ? `RIGHT('0' + CAST(${masterColumn(existing, config.monthColumn)} AS VARCHAR(2)), 2)` : 'NULL'} AS periodMonth,
        CAST(${masterColumn(existing, config.workflowColumn)} AS NVARCHAR(20)) AS workflowView,
        ${masterColumn(existing, config.revisionColumn)} AS revisionNo,
        CAST(${masterColumn(existing, config.statusColumn)} AS NVARCHAR(20)) AS status
      FROM ${config.table} AS H WITH (UPDLOCK, HOLDLOCK)
      WHERE ${masterColumn(existing, config.idColumn)} = :headerId
    `,
    {
      replacements: { headerId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
}

function addMasterSetIfExists(setList, existing, columnName, expression) {
  if (columnName && existing.has(columnName)) {
    setList.push(`${quotedColumn(columnName)} = ${expression}`);
  }
}

async function approveMasterApprovalFromPending(moduleKey, sessionId, user, options = {}) {
  assertMasterVNManager(user);

  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  const userId = getMasterUserId(user);
  const approvedByName = getMasterUserName(user) || userId;
  const approvedByTitle = getMasterApprovalTitle(options);
  const notes = options?.notes || options?.remarks || null;

  if (!userId) {
    const err = new Error('User is not authenticated');
    err.statusCode = 401;
    throw err;
  }

  return sequelizeMSQL.transaction(async (transaction) => {
    const existing = await getExistingColumns(config.table);
    const header = await getMasterApprovalHeaderById(moduleKey, sessionId, transaction);
    if (!header) {
      const err = new Error('No master planning revision is waiting for approval.');
      err.statusCode = 404;
      throw err;
    }
    if (header.status !== 'REQUESTED') {
      const err = new Error('Only requested master planning revisions can be approved.');
      err.statusCode = 400;
      throw err;
    }

    const supersedeSet = [`${quotedColumn(config.statusColumn)} = 'SUPERSEDED'`];
    addMasterSetIfExists(supersedeSet, existing, config.lockedColumn, '1');
    addMasterSetIfExists(supersedeSet, existing, config.updatedByColumn, ':userId');
    addMasterSetIfExists(supersedeSet, existing, config.updatedDateColumn, 'GETDATE()');

    await sequelizeMSQL.query(
      `
        UPDATE ${config.table}
        SET ${supersedeSet.join(', ')}
        WHERE ${quotedColumn(config.yearColumn)} = :year
          ${config.monthColumn ? `AND ${quotedColumn(config.monthColumn)} = :month` : ''}
          AND ${quotedColumn(config.workflowColumn)} = :workflowView
          AND ${quotedColumn(config.statusColumn)} = 'APPROVED'
          AND ${quotedColumn(config.idColumn)} <> :headerId
      `,
      {
        replacements: {
          year: header.periodYear,
          month: header.periodMonth,
          workflowView: header.workflowView,
          headerId: header.id,
          userId,
        },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    const approveSet = [`${quotedColumn(config.statusColumn)} = 'APPROVED'`];
    addMasterSetIfExists(approveSet, existing, config.lockedColumn, '1');
    addMasterSetIfExists(approveSet, existing, config.approvedByColumn, ':userId');
    addMasterSetIfExists(approveSet, existing, config.approvedByNameColumn, ':approvedByName');
    addMasterSetIfExists(approveSet, existing, config.approvedByTitleColumn, ':approvedByTitle');
    addMasterSetIfExists(approveSet, existing, config.approvedDateColumn, 'GETDATE()');
    addMasterSetIfExists(approveSet, existing, config.notesColumn, `COALESCE(:notes, ${quotedColumn(config.notesColumn)})`);
    addMasterSetIfExists(approveSet, existing, config.updatedByColumn, ':userId');
    addMasterSetIfExists(approveSet, existing, config.updatedDateColumn, 'GETDATE()');

    await sequelizeMSQL.query(
      `
        UPDATE ${config.table}
        SET ${approveSet.join(', ')}
        WHERE ${quotedColumn(config.idColumn)} = :headerId
      `,
      {
        replacements: {
          headerId: header.id,
          userId,
          approvedByName,
          approvedByTitle,
          notes,
        },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    return {
      module: moduleKey,
      sessionId: normalizeValue(header.id),
      approvedBy: 'approver',
      approvedByLabel: 'Manager',
    };
  });
}

async function rejectMasterApprovalFromPending(moduleKey, sessionId, user, reason) {
  assertMasterVNManager(user);

  const config = MASTER_APPROVAL_CONFIGS[moduleKey];
  const userId = getMasterUserId(user);
  if (!userId) {
    const err = new Error('User is not authenticated');
    err.statusCode = 401;
    throw err;
  }

  return sequelizeMSQL.transaction(async (transaction) => {
    const existing = await getExistingColumns(config.table);
    const header = await getMasterApprovalHeaderById(moduleKey, sessionId, transaction);
    if (!header) {
      const err = new Error('No master planning revision is waiting for approval.');
      err.statusCode = 404;
      throw err;
    }
    if (header.status !== 'REQUESTED') {
      const err = new Error('Only requested master planning revisions can be rejected.');
      err.statusCode = 400;
      throw err;
    }

    const rejectSet = [`${quotedColumn(config.statusColumn)} = 'REJECTED'`];
    addMasterSetIfExists(rejectSet, existing, config.lockedColumn, '0');
    addMasterSetIfExists(rejectSet, existing, config.rejectedByColumn, ':userId');
    addMasterSetIfExists(rejectSet, existing, config.rejectedDateColumn, 'GETDATE()');
    addMasterSetIfExists(rejectSet, existing, config.notesColumn, `COALESCE(:reason, ${quotedColumn(config.notesColumn)})`);
    addMasterSetIfExists(rejectSet, existing, config.updatedByColumn, ':userId');
    addMasterSetIfExists(rejectSet, existing, config.updatedDateColumn, 'GETDATE()');

    await sequelizeMSQL.query(
      `
        UPDATE ${config.table}
        SET ${rejectSet.join(', ')}
        WHERE ${quotedColumn(config.idColumn)} = :headerId
      `,
      {
        replacements: {
          headerId: header.id,
          userId,
          reason: reason || null,
        },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    return {
      module: moduleKey,
      sessionId: normalizeValue(header.id),
      rejectedBy: userId,
      rejectedReason: reason || '',
    };
  });
}

// =============================================================================
// UNIT TIDAK SIAP (INTERNAL — Sertifikat Bagian / Thermo / Timbangan)
// =============================================================================
// FA menandai sertifikat internal is_tidak_dapat=1 lewat tidak-dapat-internal.
// controller. Alur approval-nya: SPV (Approver_No=10) -> MGR (Approver_No=11)
// pada tabel {mainTable}_Status. Belum ada scanner-nya di halaman Pending
// Approvals — modul ini menambahkannya sebagai satu module key `unit-tidak-siap`.

const UNIT_TIDAK_SIAP_APPR_NO_SPV = 10;
const UNIT_TIDAK_SIAP_APPR_NO_MGR = 11;

const UNIT_TIDAK_SIAP_TIPE_CONFIG = {
  bagian: {
    mainTable: 'T_Kalibrasi_Sertifikat_Bagian',
    statusTable: 'T_Kalibrasi_Sertifikat_Bagian_Status',
    applicationCode: 'KAL_Sert_Bagian',
    deepLinkPath: '/sertifikat-bagian',
  },
  thermohygro: {
    mainTable: 'T_Kalibrasi_Sertifikat_Thermohygro',
    statusTable: 'T_Kalibrasi_Sertifikat_Thermohygro_Status',
    applicationCode: 'KAL_Sert_Thermo',
    deepLinkPath: '/sertifikat-thermo',
  },
  timbangan: {
    mainTable: 'T_Kalibrasi_Sertifikat_Timbangan',
    statusTable: 'T_Kalibrasi_Sertifikat_Timbangan_Status',
    applicationCode: 'KAL_Sert_Timbangan',
    deepLinkPath: '/sertifikat-timbangan',
  },
};

function isUnitTidakSiapModule(module) {
  return String(module || '').toLowerCase() === 'unit-tidak-siap';
}

function parseUnitTidakSiapSessionId(sessionId) {
  const raw = String(sessionId || '');
  const colonIdx = raw.indexOf(':');
  if (colonIdx < 0) return { tipe: '', qaId: '', idNoSertifikat: '' };
  const tipe = raw.slice(0, colonIdx);
  const rest = raw.slice(colonIdx + 1);
  const [qaId, idNoSertifikat] = rest.split('~');
  return {
    tipe,
    qaId: qaId || '',
    idNoSertifikat: idNoSertifikat || '',
  };
}

function normalizeUnitTidakSiapRow(tipe, raw) {
  const cfg = UNIT_TIDAK_SIAP_TIPE_CONFIG[tipe];
  const qaId = normalizeValue(raw.QA_ID);
  const idNoSertifikat = normalizeValue(raw.ID_No_Sertifikat);
  const spvDone = Number(raw.spv_done) > 0;
  const pendingLevel = spvDone ? 'manager' : 'officer';
  const pendingRole = spvDone ? 'Manager' : 'Officer/Supervisor';
  return {
    module: 'unit-tidak-siap',
    moduleDisplayName: 'Unit Tidak Siap',
    sessionId: `${tipe}:${qaId}~${idNoSertifikat}`,
    qaId,
    idNoSertifikat,
    instrumentName: normalizeValue(raw.Assm_nama_instrumen),
    calibrationDate: normalizeDate(raw.Tgl_kalibrasi),
    requester: normalizeValue(raw.requester),
    updatedAt: normalizeDate(raw.tanggal_label_OOC || raw.tgl),
    approvedByAdmin: '',
    approvedByAdminDate: '',
    approvedByOfficer: spvDone ? normalizeValue(raw.spv_user) : '',
    approvedByOfficerDate: spvDone ? normalizeDate(raw.spv_date) : '',
    approvedByManager: '',
    approvedByManagerDate: '',
    pendingLevel,
    pendingRole,
    deepLink: `${cfg.deepLinkPath}?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
  };
}

async function scanUnitTidakSiapPendingForTipe(tipe, filters = {}) {
  const cfg = UNIT_TIDAK_SIAP_TIPE_CONFIG[tipe];
  if (!cfg) return [];
  const search = buildLikeSearch(filters.search);
  const requesterLike = buildLikeSearch(filters.requester);
  const replacements = {};

  let where = `
    WHERE M.is_tidak_dapat = 1
      AND MGR.QA_ID IS NULL
  `;

  if (search) {
    where += `
      AND (
        M.QA_ID LIKE :search
        OR M.ID_No_Sertifikat LIKE :search
        OR M.Assm_nama_instrumen LIKE :search
      )
    `;
    replacements.search = search;
  }

  if (requesterLike) {
    where += ` AND dbo.fnGetInisialKaryawan(M.UserID) LIKE :requester`;
    replacements.requester = requesterLike;
  }

  const query = `
    SELECT TOP 200
      M.QA_ID,
      M.ID_No_Sertifikat,
      M.Assm_nama_instrumen,
      M.Tgl_kalibrasi,
      M.tanggal_label_OOC,
      M.tgl,
      dbo.fnGetInisialKaryawan(M.UserID) AS requester,
      CASE WHEN SPV.QA_ID IS NULL THEN 0 ELSE 1 END AS spv_done,
      SPV.User_ID AS spv_user,
      SPV.Process_Date AS spv_date
    FROM ${cfg.mainTable} AS M
    OUTER APPLY (
      SELECT TOP 1 s.QA_ID, s.User_ID, s.Process_Date
      FROM ${cfg.statusTable} AS s
      WHERE s.QA_ID = M.QA_ID
        AND s.ID_No_Sertifikat = M.ID_No_Sertifikat
        AND s.Approver_No = ${UNIT_TIDAK_SIAP_APPR_NO_SPV}
        AND ISNULL(s.isReject, 0) = 0
    ) AS SPV
    OUTER APPLY (
      SELECT TOP 1 s.QA_ID
      FROM ${cfg.statusTable} AS s
      WHERE s.QA_ID = M.QA_ID
        AND s.ID_No_Sertifikat = M.ID_No_Sertifikat
        AND s.Approver_No = ${UNIT_TIDAK_SIAP_APPR_NO_MGR}
        AND ISNULL(s.isReject, 0) = 0
    ) AS MGR
    ${where}
    ORDER BY M.tanggal_label_OOC DESC, M.tgl DESC
  `;

  const rows = await sequelizeMSQL.query(query, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
  });

  return rows.map((raw) => normalizeUnitTidakSiapRow(tipe, raw));
}

async function scanUnitTidakSiapPending(filters = {}) {
  const tipes = Object.keys(UNIT_TIDAK_SIAP_TIPE_CONFIG);
  const results = [];
  const errors = [];
  for (const tipe of tipes) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanUnitTidakSiapPendingForTipe(tipe, filters);
      results.push(...rows);
    } catch (err) {
      console.error(`[pendingCalibrationApprovals] scan unit-tidak-siap/${tipe} failed:`, err.message);
      errors.push({ tipe, message: err.message });
    }
  }
  return { rows: results, errors };
}

async function assertUnitTidakSiapApprover(cfg, userId) {
  const result = await sequelizeMSQL.query(`
    SELECT Appr_Identity FROM m_approver_lines
    WHERE isactive = 1
      AND Appr_ApplicationCode = :appCode
      AND Appr_ID = :userId
      AND Appr_No = 1
  `, {
    replacements: { appCode: cfg.applicationCode, userId },
    type: Sequelize.QueryTypes.SELECT,
  });
  if (result.length === 0) {
    const err = new Error('Anda tidak memiliki hak untuk mereview tidak dapat ini');
    err.statusCode = 403;
    throw err;
  }
  return result[0].Appr_Identity || 0;
}

async function approveUnitTidakSiapFromPending(sessionId, user) {
  const { tipe, qaId, idNoSertifikat } = parseUnitTidakSiapSessionId(sessionId);
  const cfg = UNIT_TIDAK_SIAP_TIPE_CONFIG[tipe];
  if (!cfg || !qaId || !idNoSertifikat) {
    const err = new Error('Session unit-tidak-siap tidak valid');
    err.statusCode = 400;
    throw err;
  }

  const userId = user?.user_id || user?.log_NIK || '';
  const delegatedTo = user?.delegated_to || null;
  const apprIdentity = await assertUnitTidakSiapApprover(cfg, userId);

  const mainCheck = await sequelizeMSQL.query(`
    SELECT is_tidak_dapat FROM ${cfg.mainTable}
    WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
  `, {
    replacements: { qaId, idNoSertifikat },
    type: Sequelize.QueryTypes.SELECT,
  });
  if (mainCheck.length === 0) {
    const err = new Error('Data sertifikat tidak ditemukan');
    err.statusCode = 404;
    throw err;
  }
  if (!mainCheck[0].is_tidak_dapat) {
    const err = new Error('Status tidak dapat dikalibrasi belum diisi oleh FA');
    err.statusCode = 400;
    throw err;
  }

  const statusRows = await sequelizeMSQL.query(`
    SELECT Approver_No FROM ${cfg.statusTable}
    WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
      AND Approver_No IN (${UNIT_TIDAK_SIAP_APPR_NO_SPV}, ${UNIT_TIDAK_SIAP_APPR_NO_MGR})
      AND ISNULL(isReject, 0) = 0
  `, {
    replacements: { qaId, idNoSertifikat },
    type: Sequelize.QueryTypes.SELECT,
  });
  const hasSpv = statusRows.some((r) => Number(r.Approver_No) === UNIT_TIDAK_SIAP_APPR_NO_SPV);
  const hasMgr = statusRows.some((r) => Number(r.Approver_No) === UNIT_TIDAK_SIAP_APPR_NO_MGR);

  if (hasMgr) {
    const err = new Error('Sudah disetujui oleh MGR');
    err.statusCode = 400;
    throw err;
  }

  const targetApprNo = hasSpv ? UNIT_TIDAK_SIAP_APPR_NO_MGR : UNIT_TIDAK_SIAP_APPR_NO_SPV;
  const approvedByLabel = hasSpv ? 'Manager' : 'Officer/Supervisor';
  const approvedByKey = hasSpv ? 'manager' : 'officer';

  await sequelizeMSQL.query(`
    INSERT INTO ${cfg.statusTable}
      (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
    VALUES
      (:qaId, :idNoSertifikat, ${targetApprNo}, 0, :apprIdentity, GETDATE(), :userId, :delegatedTo, NULL)
  `, {
    replacements: { qaId, idNoSertifikat, apprIdentity, userId, delegatedTo },
    type: Sequelize.QueryTypes.INSERT,
  });

  return {
    module: 'unit-tidak-siap',
    sessionId,
    approvedBy: approvedByKey,
    approvedByLabel,
  };
}

async function rejectUnitTidakSiapFromPending(sessionId, user, reason) {
  const { tipe, qaId, idNoSertifikat } = parseUnitTidakSiapSessionId(sessionId);
  const cfg = UNIT_TIDAK_SIAP_TIPE_CONFIG[tipe];
  if (!cfg || !qaId || !idNoSertifikat) {
    const err = new Error('Session unit-tidak-siap tidak valid');
    err.statusCode = 400;
    throw err;
  }

  const userId = user?.user_id || user?.log_NIK || '';
  await assertUnitTidakSiapApprover(cfg, userId);

  const statusRows = await sequelizeMSQL.query(`
    SELECT Approver_No FROM ${cfg.statusTable}
    WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
      AND Approver_No IN (${UNIT_TIDAK_SIAP_APPR_NO_SPV}, ${UNIT_TIDAK_SIAP_APPR_NO_MGR})
      AND ISNULL(isReject, 0) = 0
  `, {
    replacements: { qaId, idNoSertifikat },
    type: Sequelize.QueryTypes.SELECT,
  });
  const hasSpv = statusRows.some((r) => Number(r.Approver_No) === UNIT_TIDAK_SIAP_APPR_NO_SPV);
  const hasMgr = statusRows.some((r) => Number(r.Approver_No) === UNIT_TIDAK_SIAP_APPR_NO_MGR);

  if (hasMgr) {
    const err = new Error('Sudah disetujui oleh MGR — tidak dapat di-reject dari sini');
    err.statusCode = 400;
    throw err;
  }

  if (hasSpv) {
    await sequelizeMSQL.query(`
      DELETE FROM ${cfg.statusTable}
      WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No IN (${UNIT_TIDAK_SIAP_APPR_NO_SPV}, ${UNIT_TIDAK_SIAP_APPR_NO_MGR})
    `, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.DELETE,
    });
    await sequelizeMSQL.query(`
      UPDATE ${cfg.mainTable}
      SET is_tidak_dapat = 0, alasan_tidak_dapat = NULL, kondisi_alat = NULL, tanggal_label_OOC = NULL
      WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
    `, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.UPDATE,
    });
  } else {
    await sequelizeMSQL.query(`
      DELETE FROM ${cfg.statusTable}
      WHERE QA_ID = :qaId AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = ${UNIT_TIDAK_SIAP_APPR_NO_SPV}
    `, {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.DELETE,
    });
  }

  return {
    module: 'unit-tidak-siap',
    sessionId,
    rejectedBy: userId,
    rejectedReason: reason || '',
  };
}

async function listPendingApprovals(options = {}) {
  const {
    bagian_user,
    moduleFilter,
    search,
    requester,
    limit = 200,
  } = options;

  const moduleKey = String(moduleFilter || '').toLowerCase();

  // If a removed module is explicitly requested, return an empty list gracefully.
  // Approval/reject endpoints still work for direct links.
  if (moduleKey && isExcludedFromPending(moduleKey)) {
    return { results: [], scanErrors: [] };
  }

  const includeWorkbook = !moduleFilter || MODULE_REGISTRY[moduleKey];
  const includeDaBagian = false;
  const includeSertifikatBagian = false;
  const includeDaThermo = false;
  const includeSertifikatThermo = false;
  const includeKalibrasiEksternal = !moduleFilter || moduleKey === 'kalibrasi-eksternal';
  const includeUnitTidakSiap = !moduleFilter || isUnitTidakSiapModule(moduleKey);
  const includeMasterApproval = !moduleFilter || isMasterApprovalModule(moduleKey);
  const includeLabelReprint = !moduleFilter || isLabelReprintModule(moduleKey);

  if (
    moduleFilter
    && !includeWorkbook
    && !includeDaBagian
    && !includeSertifikatBagian
    && !includeDaThermo
    && !includeSertifikatThermo
    && !includeKalibrasiEksternal
    && !includeUnitTidakSiap
    && !includeMasterApproval
    && !includeLabelReprint
  ) {
    const error = new Error(`Unknown calibration module: ${moduleFilter}`);
    error.statusCode = 400;
    throw error;
  }

  const results = [];
  // Modul yang gagal di-scan (mis. kolom approval belum ada karena migrasi belum
  // jalan) tetap dilaporkan ke caller alih-alih hanya console.error, supaya modul
  // tidak lenyap senyap dari halaman tanpa jejak untuk user.
  const scanErrors = [];

  if (includeWorkbook) {
    const modulesToScan = moduleFilter
      ? [{ key: moduleKey, config: MODULE_REGISTRY[moduleKey] }]
      : moduleKeys()
        .map((key) => ({ key, config: MODULE_REGISTRY[key] }))
        .filter(({ key }) => !isExcludedFromPending(key));

    for (const { key, config } of modulesToScan) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const rows = await scanModule(config, { search, requester });
        for (const raw of rows) {
          const normalized = normalizeRow(config, key, raw);
          // Oversight page: show every pending item regardless of which role
          // it's currently waiting on. The Approve button itself is still
          // gated per-row by the viewer's role (FE canAct / BE approveSession).
          results.push(normalized);
        }
      } catch (err) {
        // Log and continue so one broken module does not block the whole page.
        console.error(`[pendingCalibrationApprovals] scan failed for ${key}:`, err.message);
        scanErrors.push({ module: key, moduleDisplayName: config.displayName, message: err.message });
      }
    }
  }

  if (includeKalibrasiEksternal) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanKalibrasiEksternalPending(search, bagian_user, requester);
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for kalibrasi-eksternal:', err.message);
      scanErrors.push({ module: 'kalibrasi-eksternal', message: err.message });
    }
  }

  if (includeUnitTidakSiap) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { rows, errors } = await scanUnitTidakSiapPending({ search, requester });
      results.push(...rows);
      for (const e of errors) {
        scanErrors.push({
          module: `unit-tidak-siap/${e.tipe}`,
          moduleDisplayName: `Unit Tidak Siap (${e.tipe})`,
          message: e.message,
        });
      }
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for unit-tidak-siap:', err.message);
      scanErrors.push({ module: 'unit-tidak-siap', message: err.message });
    }
  }

  if (includeMasterApproval) {
    const masterModulesToScan = moduleFilter
      ? [moduleKey]
      : Array.from(MASTER_APPROVAL_MODULES);

    for (const masterModuleKey of masterModulesToScan) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const rows = await scanMasterApprovalPending(masterModuleKey, {
          search,
          requester,
        });
        results.push(...rows);
      } catch (err) {
        console.error(
          `[pendingCalibrationApprovals] scan failed for ${masterModuleKey}:`,
          err.message
        );
        scanErrors.push({ module: masterModuleKey, message: err.message });
      }
    }
  }

  if (includeLabelReprint) {
    try {
      const sourceModule = moduleFilter ? getLabelReprintSourceModule(moduleKey) : '';
      // eslint-disable-next-line no-await-in-loop
      const rows = await scanLabelReprintPending({ search, requester, sourceModule });
      results.push(...rows);
    } catch (err) {
      console.error('[pendingCalibrationApprovals] scan failed for label-reprint:', err.message);
      scanErrors.push({ module: 'label-reprint', message: err.message });
    }
  }

  results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  return { results: results.slice(0, limit), scanErrors };
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

async function getSessionForManagerFinalization(config, sessionId) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        QA_ID,
        ID_No_Sertifikat,
        Evaluation_Result
      FROM ${config.table}
      WHERE ${config.idColumn} = :sessionId
    `,
    {
      replacements: { sessionId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] || null;
}

async function approveConformingManagerSession({
  config,
  ac,
  sessionId,
  userId,
  user,
  pendingRole,
}) {
  const sessionForFinalization = await getSessionForManagerFinalization(config, sessionId);
  if (!sessionForFinalization) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  if (!normalizeValue(sessionForFinalization.Evaluation_Result)) {
    const err = new Error('Pilih hasil evaluasi workbook terlebih dahulu');
    err.statusCode = 422;
    throw err;
  }

  await sequelizeMSQL.transaction(async (transaction) => {
    const finalizationUser = {
      ...user,
      user_id: user?.user_id || user?.log_NIK || userId,
      delegated_to:
        user?.delegated_to ||
        user?.delegatedTo?.user_id ||
        user?.delegatedTo?.log_NIK ||
        userId,
    };

    await finalizeManagerCalibrationApproval({
      certificateType: config.finalizationCertificateType,
      session: sessionForFinalization,
      user: finalizationUser,
      transaction,
    });

    await sequelizeMSQL.query(
      `
        UPDATE ${config.table}
        SET
          ${ac[pendingRole.key]} = :userId,
          ${ac[`${pendingRole.key}Date`]} = GETDATE(),
          ${config.statusColumn} = :status,
          Update_Date = GETDATE()
        WHERE ${config.idColumn} = :sessionId
      `,
      {
        replacements: {
          userId,
          status: pendingRole.status,
          sessionId,
        },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );
  });
}

async function approveSession(module, sessionId, user, options = {}) {
  const moduleKey = String(module || '').toLowerCase();
  if (isUnitTidakSiapModule(moduleKey)) {
    return approveUnitTidakSiapFromPending(sessionId, user);
  }
  if (isLabelReprintModule(moduleKey)) {
    const userId = user?.user_id || user?.log_NIK || '';
    const updated = await labelReprintRequestsController.approveRequestById(sessionId, userId);
    return {
      module: moduleKey,
      sessionId,
      approvedBy: 'manager',
      approvedByLabel: 'Manager',
      labelReprintRequest: labelReprintRequestsController.toApiShape(updated),
    };
  }
  if (isMasterApprovalModule(moduleKey)) {
    return approveMasterApprovalFromPending(moduleKey, sessionId, user, options);
  }

  if (isBagianModule(module)) {
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
  const isConformingManagerFinalization = Boolean(config.finalizationCertificateType)
    && pendingRole.key === 'manager';

  const result = {
    module: key,
    sessionId,
    approvedBy: pendingRole.key,
    approvedByLabel: pendingRole.label,
  };

  if (isConformingManagerFinalization) {
    await approveConformingManagerSession({
      config,
      ac,
      sessionId,
      userId,
      user,
      pendingRole,
    });
    return result;
  }

  const publishHandler = FINAL_APPROVAL_PUBLISH_HANDLERS[key];
  const isFinalWorkbookApproval = Boolean(publishHandler) && pendingRole.key === 'manager';

  if (isFinalWorkbookApproval) {
    const evalRequest = await createRequest();
    const evalResult = await evalRequest
      .input('SessionId', sessionId)
      .query(`
        SELECT evaluation_result
        FROM ${config.table}
        WHERE ${config.idColumn} = @SessionId
      `);
    if (!evalResult.recordset[0]?.evaluation_result) {
      const err = new Error(
        'Hasil evaluasi (kesimpulan) belum dipilih. Approval Manager bersifat final dan akan otomatis menerbitkan serta menyetujui sertifikat, jadi pilih hasil evaluasi terlebih dahulu.'
      );
      err.statusCode = 422;
      throw err;
    }
  }

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

  if (isFinalWorkbookApproval) {
    try {
      const publishResult = await publishHandler(
        Number(sessionId),
        userId,
        userId,
        {}
      );
      result.certificate = {
        qa_id: publishResult.qa_id,
        id_no_sertifikat: publishResult.id_no_sertifikat,
        created_new_sertifikat: publishResult.created_new_sertifikat,
        published_rows: publishResult.published_rows,
        certificate_approved: publishResult.certificate_approved,
        print_data_endpoint: publishResult.next?.print_data_endpoint || publishResult.print_data_endpoint,
      };
    } catch (publishError) {
      // Manager approval is already committed at this point; surface the
      // certificate failure as a warning instead of failing the approval call.
      result.certificateError =
        `Workbook approved, tetapi sertifikat & DA gagal diterbitkan otomatis: ${publishError.message}`;
    }
  }

  return result;
}

async function rejectSession(module, sessionId, user, reason) {
  const moduleKey = String(module || '').toLowerCase();
  if (isUnitTidakSiapModule(moduleKey)) {
    return rejectUnitTidakSiapFromPending(sessionId, user, reason);
  }
  if (isLabelReprintModule(moduleKey)) {
    const userId = user?.user_id || user?.log_NIK || '';
    const updated = await labelReprintRequestsController.rejectRequestById(sessionId, userId, reason);
    return {
      module: moduleKey,
      sessionId,
      labelReprintRequest: labelReprintRequestsController.toApiShape(updated),
    };
  }
  if (isMasterApprovalModule(moduleKey)) {
    return rejectMasterApprovalFromPending(moduleKey, sessionId, user, reason);
  }

  if (isBagianModule(module)) {
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
