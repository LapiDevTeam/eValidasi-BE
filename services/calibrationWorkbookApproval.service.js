'use strict';

const { sequelizeMSQL } = require('../config/config.sequelize.dbmssql');
const { Sequelize } = require('../models');

const APPROVAL_ROLES = Object.freeze({
  admin: {
    key: 'admin',
    label: 'Admin',
    column: 'ApprovedByAdmin',
    dateColumn: 'ApprovedByAdminDate',
    status: 'APPROVED_ADMIN',
  },
  officer: {
    key: 'officer',
    label: 'Officer/Supervisor',
    column: 'ApprovedByOfficer',
    dateColumn: 'ApprovedByOfficerDate',
    status: 'APPROVED_OFFICER',
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    column: 'ApprovedByManager',
    dateColumn: 'ApprovedByManagerDate',
    status: 'APPROVED',
  },
});

function getActorJobLevel(req) {
  return Number(
    req?.user?.joblevel_id_user ??
      req?.user?.job_level_id ??
      req?.user?.Job_LevelID ??
      req?.body?.job_level_id ??
      req?.body?.jobLevelId ??
      req?.body?.Job_LevelID ??
      0
  );
}

function getActorApprovalRole(req) {
  const jobLevel = getActorJobLevel(req);
  if (jobLevel > 6) return APPROVAL_ROLES.admin;
  if (jobLevel === 5 || jobLevel === 6) return APPROVAL_ROLES.officer;
  if (jobLevel === 3) return APPROVAL_ROLES.manager;
  return null;
}

function normalizeApprovalRoleKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['admin', 'pelaksana'].includes(text)) return 'admin';
  if (['officer', 'spv', 'supervisor', 'diketahui', 'diketahui_oleh'].includes(text)) {
    return 'officer';
  }
  if (['manager', 'disetujui', 'disetujui_oleh'].includes(text)) return 'manager';
  return '';
}

function getRequestedApprovalRole(req) {
  const key = normalizeApprovalRoleKey(
    req?.body?.approval_role ??
      req?.body?.approvalRole ??
      req?.body?.target_role ??
      req?.body?.targetRole
  );
  return key ? APPROVAL_ROLES[key] || null : null;
}

function resolveTargetApprovalRole(req) {
  return getRequestedApprovalRole(req) || getActorApprovalRole(req);
}

function canActorApproveTarget(actorRole, targetRole) {
  if (!actorRole || !targetRole) return false;
  if (actorRole.key === 'admin') return targetRole.key === 'admin';
  if (actorRole.key === 'officer') {
    return targetRole.key === 'admin' || targetRole.key === 'officer';
  }
  if (actorRole.key === 'manager') {
    return (
      targetRole.key === 'admin' ||
      targetRole.key === 'officer' ||
      targetRole.key === 'manager'
    );
  }
  return false;
}

function assertWorkbookApproval({
  session,
  actorRole,
  targetRole,
  certificateApprovedByManager = false,
}) {
  if (!actorRole) return 'User tidak memiliki role approval workbook';
  if (!targetRole) return 'Target approval workbook tidak valid';
  if (!canActorApproveTarget(actorRole, targetRole)) {
    return `Role ${actorRole.label} tidak bisa approve sebagai ${targetRole.label}`;
  }
  if (session?.[targetRole.column]) {
    return `Workbook sudah approve oleh ${targetRole.label}`;
  }
  if (actorRole.key !== 'admin' && !String(session?.ID_No_Sertifikat || '').trim()) {
    return 'Generate sertifikat terlebih dahulu sebelum approve workbook.';
  }
  if (targetRole.key === 'officer' && !session?.ApprovedByAdmin) {
    return 'Admin harus approve workbook terlebih dahulu';
  }
  if (targetRole.key === 'manager') {
    if (!session?.ApprovedByAdmin) return 'Admin harus approve workbook terlebih dahulu';
    if (!session?.ApprovedByOfficer) {
      return 'Officer/Supervisor harus approve workbook terlebih dahulu';
    }
    if (!certificateApprovedByManager) {
      return 'Sertifikat harus approve manager terlebih dahulu';
    }
  }
  return '';
}

async function hasCertificateManagerApproval({
  qaId,
  idNoSertifikat,
  statusTable = 'T_Kalibrasi_Sertifikat_Bagian_Status',
}) {
  if (!qaId || !idNoSertifikat) return false;
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1 1 AS isApproved
      FROM ${statusTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
        AND ISNULL(isReject, 0) = 0
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );
  return rows.length > 0;
}

module.exports = {
  APPROVAL_ROLES,
  assertWorkbookApproval,
  getActorApprovalRole,
  getActorJobLevel,
  hasCertificateManagerApproval,
  resolveTargetApprovalRole,
};
