'use strict';

/**
 * timbanganCalculation.service.js — Timbangan Calibration orchestration
 *
 * Ties the pure math engine (timbanganFormula.service) to the repository.
 * Controllers call only this.
 *
 * Workflow (reproduced from TIMBANGAN.xls):
 *   1. Save session identity + sub-tests (pre-adjust, repeatability, points,
 *      eccentricity, hysteresis) in one transactional replace.
 *   2. Calculate per-point error + uncertainty, repeatability, LOP, hysteresis,
 *      and the overall conclusion; auto-derive II. IDENTITAS STANDAR.
 *   3. Publish into T_Kalibrasi_Sertifikat_Timbangan + 4 detail tables
 *      (Pre_Adj, Daya_Ulang, Massa_Std, Pusat_Pan) — the legacy table read by
 *      PrintMassa.jsx, which has dedicated columns for every section.
 */

const sql = require('mssql');
const repo = require('../../repositories/timbangan-calibration.repository');
const formula = require('./timbanganFormula.service');
const { hasCertificateGenerator } = require('../constants/certificateTypeCodes');

function httpError(message, statusCode = 400, validation) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (validation) err.validation = validation;
  return err;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toPositiveIntegerOrNull(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

// Manual evaluation verdict — three canonical options, identical wording to the
// Thermohygrometer / Friability / Timer workbook. Picked manually by the
// technician; the computed `conclusion` is only a suggestion.
const EVALUATION_OPTIONS = [
  'Layak digunakan',
  'Tidak layak digunakan',
  'Penggunaan faktor koreksi',
];

function normalizeEvaluationResult(value) {
  const text = String(value ?? '').trim();
  return EVALUATION_OPTIONS.includes(text) ? text : '';
}

// ---------------------------------------------------------------------------
// ROLE-BASED APPROVAL (Thermohygrometer-style)
// ---------------------------------------------------------------------------

const APPROVAL_ROLES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    column: 'approved_by_admin',
    dateColumn: 'approved_by_admin_date',
    rank: 1,
  },
  officer: {
    key: 'officer',
    label: 'Officer/Supervisor',
    column: 'approved_by_officer',
    dateColumn: 'approved_by_officer_date',
    rank: 2,
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    column: 'approved_by_manager',
    dateColumn: 'approved_by_manager_date',
    rank: 3,
  },
};

function getWorkbookApprovalRole(jobLevel) {
  const level = Number(jobLevel);
  if (Number.isNaN(level)) return null;
  if (level > 6) return APPROVAL_ROLES.admin;
  if (level === 5 || level === 6) return APPROVAL_ROLES.officer;
  if (level === 3) return APPROVAL_ROLES.manager;
  return null;
}

function getPendingRole(session) {
  if (!session?.approved_by_admin) return APPROVAL_ROLES.admin;
  if (!session?.approved_by_officer) return APPROVAL_ROLES.officer;
  if (!session?.approved_by_manager) return APPROVAL_ROLES.manager;
  return null;
}

function canApproveRole(userRole, pendingRole) {
  if (!userRole || !pendingRole) return false;
  return userRole.rank >= pendingRole.rank;
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

// ---------------------------------------------------------------------------
// SESSION CRUD
// ---------------------------------------------------------------------------

async function createSession(body, createdBy) {
  const sessionId = await repo.createSession({
    ...body,
    unit: body.unit || 'kg',
    evaluation_result: normalizeEvaluationResult(body.evaluation_result) || null,
    status: 'DRAFT',
    created_by: createdBy || null,
  });
  return { sessionId };
}

async function updateSession(sessionId, body, updatedBy) {
  const existing = await repo.getSessionById(sessionId);
  if (!existing) throw httpError(`Session ${sessionId} not found.`, 404);
  const ok = await repo.updateSession(sessionId, {
    ...body,
    unit: body.unit || existing.unit || 'kg',
    evaluation_result:
      body.evaluation_result !== undefined
        ? normalizeEvaluationResult(body.evaluation_result) || null
        : existing.evaluation_result || null,
    updated_by: updatedBy || null,
  });
  return { updated: ok };
}

// ---------------------------------------------------------------------------
// SAVE WORKBOOK (all sub-tests in one transactional replace)
// ---------------------------------------------------------------------------

async function saveWorkbook(sessionId, payload = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    await repo.deleteResultsBySession(sessionId, transaction);
    await repo.deletePointsBySession(sessionId, transaction);
    await repo.deletePreadjustBySession(sessionId, transaction);
    await repo.deleteRepeatabilityBySession(sessionId, transaction);
    await repo.deleteEccentricityBySession(sessionId, transaction);
    await repo.deleteHysteresisBySession(sessionId, transaction);

    const counts = { points: 0, standards: 0, preadjust: 0, repeatability: 0, eccentricity: 0, hysteresis: 0 };

    // Pre-adjustment
    const preadjust = Array.isArray(payload.preadjust) ? payload.preadjust : [];
    for (let i = 0; i < preadjust.length; i += 1) {
      const r = preadjust[i];
      await repo.insertPreadjustRow(sessionId, {
        row_order: r.row_order ?? i + 1,
        at_no_id: r.at_no_id ?? null,
        konvensional_g: toNumberOrNull(r.konvensional_g) ?? 0,
        uut_reading: toNumberOrNull(r.uut_reading) ?? 0,
        zero_reading: toNumberOrNull(r.zero_reading) ?? 0,
      }, transaction);
      counts.preadjust += 1;
    }

    // Repeatability
    const repeatability = Array.isArray(payload.repeatability) ? payload.repeatability : [];
    for (let i = 0; i < repeatability.length; i += 1) {
      const r = repeatability[i];
      await repo.insertRepeatabilityRow(sessionId, {
        row_no: r.row_no ?? i + 1,
        half_zero: toNumberOrNull(r.half_zero) ?? 0,
        half_reading: toNumberOrNull(r.half_reading) ?? 0,
        max_zero: toNumberOrNull(r.max_zero) ?? 0,
        max_reading: toNumberOrNull(r.max_reading) ?? 0,
      }, transaction);
      counts.repeatability += 1;
    }

    // Points + standards
    const points = Array.isArray(payload.points) ? payload.points : [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const pointId = await repo.createPoint(sessionId, {
        point_order: p.point_order ?? i + 1,
        unit: p.unit || session.unit || 'kg',
        is_active: true,
      }, transaction);
      counts.points += 1;

      const standards = Array.isArray(p.standards) ? p.standards : [];
      for (let s = 0; s < standards.length; s += 1) {
        const st = standards[s];
        await repo.insertPointStandard(sessionId, pointId, {
          row_order: st.row_order ?? s + 1,
          at_no_id: st.at_no_id ?? null,
          konvensional_g: toNumberOrNull(st.konvensional_g) ?? 0,
          uc_mg: toNumberOrNull(st.uc_mg) ?? 0,
          uut_reading: toNumberOrNull(st.uut_reading) ?? 0,
          zero_reading: toNumberOrNull(st.zero_reading) ?? 0,
        }, transaction);
        counts.standards += 1;
      }
    }

    // Eccentricity
    const eccentricity = Array.isArray(payload.eccentricity) ? payload.eccentricity : [];
    for (let i = 0; i < eccentricity.length; i += 1) {
      const r = eccentricity[i];
      await repo.insertEccentricityRow(sessionId, {
        position: r.position ?? i,
        baca1: toNumberOrNull(r.baca1) ?? 0,
        baca2: toNumberOrNull(r.baca2) ?? 0,
      }, transaction);
      counts.eccentricity += 1;
    }

    // Hysteresis
    const hysteresis = Array.isArray(payload.hysteresis) ? payload.hysteresis : [];
    for (let i = 0; i < hysteresis.length; i += 1) {
      const r = hysteresis[i];
      await repo.insertHysteresisRow(sessionId, {
        row_order: r.row_order ?? i + 1,
        label: r.label ?? null,
        col1: toNumberOrNull(r.col1),
        col2: toNumberOrNull(r.col2),
      }, transaction);
      counts.hysteresis += 1;
    }

    await repo.updateSessionStatus(sessionId, 'DRAFT', session.updated_by, transaction);
    await transaction.commit();
    return counts;
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// STANDARD IDENTITY DERIVATION (II. IDENTITAS STANDAR)
// ---------------------------------------------------------------------------

function uniqueClean(values) {
  const seen = new Set();
  const out = [];
  values.forEach((raw) => {
    const v = String(raw ?? '').trim().replace(/[;,]\s*$/, '').trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}

/**
 * Build the certificate "II. IDENTITAS STANDAR" strings from the AT weights
 * used across all points (+ pre-adjustment), looked up against the AT master.
 */
function deriveStandardIdentity(usedNoIds, atMap) {
  const rows = uniqueClean(usedNoIds)
    .map((noId) => atMap.get(String(noId).trim()))
    .filter(Boolean);

  if (!rows.length) {
    return { std_nama: '', std_no_identitas: '', std_no_sertifikat: '', std_tertelusur: '', std_rekalibrasi: '' };
  }

  const ids = uniqueClean(rows.map((r) => r.no_id_label || r.no_id));
  const kelas = uniqueClean(rows.map((r) => r.kelas));
  const sertifikat = uniqueClean(rows.map((r) => r.no_sertifikat));
  const tertelusur = uniqueClean(rows.map((r) => r.tertelusur));
  const rekal = uniqueClean(rows.map((r) => r.rekalibrasi));

  return {
    std_nama: kelas.length ? `AT Standar ${kelas.join(', ')}` : 'AT Standar',
    std_no_identitas: `AT (${ids.join(', ')})`,
    std_no_sertifikat: sertifikat.join(', '),
    std_tertelusur: tertelusur.join(', '),
    std_rekalibrasi: rekal.join(', '),
  };
}

// ---------------------------------------------------------------------------
// CALCULATE
// ---------------------------------------------------------------------------

async function calculate(sessionId, changedBy = null) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const points = await repo.listPoints(sessionId, transaction);
    if (!points.length) {
      throw httpError('No measurement points found.', 422, [{ field: 'points', message: 'Add at least one measurement point.' }]);
    }

    const pointStandards = await repo.listPointStandards(sessionId, transaction);
    const repeatabilityRows = await repo.listRepeatability(sessionId, transaction);
    const preadjustRows = await repo.listPreadjust(sessionId, transaction);
    const eccentricityRows = await repo.listEccentricity(sessionId, transaction);
    const hysteresisRows = await repo.listHysteresis(sessionId, transaction);

    const resolusi = toNumberOrNull(session.resolusi) ?? 0;

    const standardsByPoint = new Map();
    for (const s of pointStandards) {
      if (!standardsByPoint.has(s.point_id)) standardsByPoint.set(s.point_id, []);
      standardsByPoint.get(s.point_id).push(s);
    }

    const rep = formula.computeRepeatability(repeatabilityRows, resolusi);
    const unit = String(session.unit || 'kg').toLowerCase();
    // kapasitas_alat is stored in the session's working unit (entered by technician in native unit).
    // Use it as the Sr half/max switchover base (threshold = 0.6 * kapasitas_alat).
    // avgMaxReading from repeatability is a fallback only — using it caused wrong Sr selection
    // in the grams workbook where kapasitas_alat (220g) differs from avgMaxReading (200g).
    const maxLoadRef = toNumberOrNull(session.kapasitas_alat)
      || toNumberOrNull(session.kapasitas_ukur)
      || rep.avgMaxReading
      || 0;

    await repo.deleteResultsBySession(sessionId, transaction);

    const resultRows = [];
    const computedForLop = [];
    let maxExpanded = 0;

    for (const point of points) {
      const standards = standardsByPoint.get(point.point_id) || [];
      const c = formula.computePoint({ standards, resolusi, repeatability: rep, maxLoadRef, unit });
      maxExpanded = Math.max(maxExpanded, c.uExpanded);
      computedForLop.push({ error: c.error, uExpanded: c.uExpanded });

      const row = {
        session_id: sessionId,
        point_id: point.point_id,
        point_order: point.point_order,
        unit: point.unit,
        konv_mass: c.konvMass,
        reading: c.reading,
        error: c.error,
        u_repeatability: c.uRepeatability,
        u_resolusi: c.uResolusi,
        u_sertifikat: c.uSertifikat,
        u_combined: c.uCombined,
        u_expanded: c.uExpanded,
        tolerance: c.tolerance,
        pass_flag: c.passFlag,
      };
      await repo.insertResult(row, transaction);
      resultRows.push(row);
    }

    const preadjust = formula.computePreadjust(preadjustRows, unit);
    const eccentricity = formula.computeEccentricity(eccentricityRows);
    const hysteresis = formula.computeHysteresis(hysteresisRows);
    const lop = formula.computeLop({
      srHalf: rep.srHalf,
      srMax: rep.srMax,
      results: computedForLop,
      unit,
      eccentricityMaxDiff: eccentricity.maxDiff,
    });
    const conclusion = formula.deriveConclusion(resultRows.map((r) => ({ passFlag: r.pass_flag })));

    await repo.upsertSummary(sessionId, {
      sr_half: rep.srHalf,
      sr_max: rep.srMax,
      sres: rep.sres,
      k_half: rep.kHalf,
      k_max: rep.kMax,
      avg_half_zero: rep.avgHalfZero,
      avg_half_reading: rep.avgHalfReading,
      avg_max_zero: rep.avgMaxZero,
      avg_max_reading: rep.avgMaxReading,
      preadjust_result: preadjust.result,
      preadjust_error: preadjust.error,
      eccentricity_max: eccentricity.maxDiff,
      hysteresis,
      cmax: lop.cmax,
      u_cmax: lop.uCmax,
      sr_max_used: lop.srMaxUsed,
      lop: lop.lop,
      coverage_factor: formula.COVERAGE_FACTOR,
      max_expanded: maxExpanded,
      conclusion,
    }, transaction);

    await repo.updateSessionConclusion(sessionId, conclusion, transaction);
    // Reset approvals on recalculation so the workbook must be re-approved.
    await repo.resetSessionApprovals(sessionId, changedBy, transaction);
    await repo.updateSessionStatus(sessionId, 'CALCULATED', changedBy, transaction);

    // Auto-derive II. IDENTITAS STANDAR and pre-fill only empty fields.
    const usedNoIds = [
      ...pointStandards.map((s) => s.at_no_id),
      ...preadjustRows.map((r) => r.at_no_id),
    ].filter((v) => !isBlank(v));
    if (usedNoIds.length) {
      const atList = await repo.listAtStandards({}, transaction);
      const atMap = new Map(atList.map((a) => [String(a.no_id).trim(), a]));
      const derived = deriveStandardIdentity(usedNoIds, atMap);
      const patch = {};
      if (isBlank(session.std_nama)) patch.std_nama = derived.std_nama;
      if (isBlank(session.std_no_identitas)) patch.std_no_identitas = derived.std_no_identitas;
      if (isBlank(session.std_no_sertifikat)) patch.std_no_sertifikat = derived.std_no_sertifikat;
      if (isBlank(session.std_tertelusur)) patch.std_tertelusur = derived.std_tertelusur;
      if (isBlank(session.std_rekalibrasi)) patch.std_rekalibrasi = derived.std_rekalibrasi;
      if (Object.keys(patch).length) {
        await repo.updateSession(sessionId, { ...session, ...patch, updated_by: changedBy }, transaction);
      }
    }

    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'timbangan_calculate',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ points: resultRows.length, conclusion }),
      changed_by: changedBy,
    }, transaction).catch(() => { /* audit optional */ });

    await transaction.commit();

    return {
      sessionId,
      conclusion,
      coverageFactor: formula.COVERAGE_FACTOR,
      maxExpanded,
      points: resultRows,
      repeatability: rep,
      preadjust,
      eccentricity,
      hysteresis,
      lop,
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// READ BUNDLE
// ---------------------------------------------------------------------------

async function getSessionBundle(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  const [points, pointStandards, preadjust, repeatability, eccentricity, hysteresis, results, summary] =
    await Promise.all([
      repo.listPoints(sessionId),
      repo.listPointStandards(sessionId),
      repo.listPreadjust(sessionId),
      repo.listRepeatability(sessionId),
      repo.listEccentricity(sessionId),
      repo.listHysteresis(sessionId),
      repo.getResults(sessionId),
      repo.getSummary(sessionId),
    ]);

  const stdByPoint = new Map();
  for (const s of pointStandards) {
    if (!stdByPoint.has(s.point_id)) stdByPoint.set(s.point_id, []);
    stdByPoint.get(s.point_id).push(s);
  }
  const pointsWithStandards = points.map((p) => ({
    ...p,
    standards: (stdByPoint.get(p.point_id) || []).sort((a, b) => a.row_order - b.row_order),
  }));

  return { session, points: pointsWithStandards, preadjust, repeatability, eccentricity, hysteresis, results, summary };
}

async function getResults(sessionId) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  const results = await repo.getResults(sessionId);
  const summary = await repo.getSummary(sessionId);
  return { sessionId, results, summary };
}

// ---------------------------------------------------------------------------
// APPROVAL
// ---------------------------------------------------------------------------

async function approveSession(sessionId, user) {
  const jobLevel = Number(
    user?.joblevel_id_user ?? user?.job_level_id ?? user?.Job_LevelID
  );
  const userId = user?.user_id || user?.log_NIK || '';
  const role = getWorkbookApprovalRole(jobLevel);

  if (!role) {
    throw httpError(`User tidak memiliki role approval workbook (job level terdeteksi: ${jobLevel || '-'}).`, 403);
  }

  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  const orderMessage = assertApprovalOrder(session, role);
  if (orderMessage) {
    throw httpError(orderMessage, 403);
  }

  const pendingRole = getPendingRole(session);
  const isFinalApproval = pendingRole.key === 'manager';

  if (isFinalApproval && !normalizeEvaluationResult(session.evaluation_result)) {
    throw httpError(
      'Hasil evaluasi (kesimpulan) belum dipilih. Approval Manager bersifat final dan akan otomatis menerbitkan serta menyetujui sertifikat, jadi pilih hasil evaluasi terlebih dahulu.',
      422,
      [{ field: 'evaluation_result', message: 'Hasil evaluasi manual belum dipilih.' }]
    );
  }

  await repo.updateSessionApproval(sessionId, { roleKey: pendingRole.key, userId });

  const result = {
    sessionId,
    approvedBy: pendingRole.key,
    approvedByLabel: pendingRole.label,
  };

  if (isFinalApproval) {
    try {
      const publishResult = await publishToSertifikat(sessionId, userId, userId, {});
      result.certificate = {
        qa_id: publishResult.qa_id,
        id_no_sertifikat: publishResult.id_no_sertifikat,
        created_new_sertifikat: publishResult.created_new_sertifikat,
        published_rows: publishResult.published_rows,
        certificate_approved: publishResult.certificate_approved,
        print_data_endpoint: publishResult.print_data_endpoint,
      };
    } catch (publishError) {
      result.certificateError =
        `Workbook approved, tetapi sertifikat gagal diterbitkan otomatis: ${publishError.message}`;
    }
  }

  return result;
}

async function rejectSession(sessionId, user, reason = '') {
  const userId = user?.user_id || user?.log_NIK || '';
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

  await repo.clearSessionApprovals(sessionId, {
    rejectedBy: userId,
    rejectedReason: reason,
  });

  return {
    sessionId,
    rejectedBy: userId,
    rejectedReason: reason,
  };
}

// finalize is deprecated: approval is now role-based (Admin -> Officer -> Manager).
async function finalize(sessionId, changedBy = null) {
  const session = await repo.getSessionById(sessionId);
  if (!session) throw httpError(`Session ${sessionId} not found.`, 404);
  if (String(session.status).toUpperCase() !== 'CALCULATED') {
    throw httpError('Session must be CALCULATED before approval.', 422, [
      { field: 'status', message: `Current status is ${session.status}.` },
    ]);
  }
  return { sessionId, status: session.status, note: 'Use role-based approve endpoint' };
}

// ---------------------------------------------------------------------------
// AT MASTER + DA CANDIDATES
// ---------------------------------------------------------------------------

async function listAtStandards(filters) {
  return repo.listAtStandards(filters);
}

async function lookupAt(noId) {
  const at = await repo.getAtByNoId(noId);
  if (!at) throw httpError(`Anak Timbangan ${noId} not found.`, 404);
  return at;
}

async function listDaCandidates(filters) {
  return repo.listTimbanganDaCandidates(filters);
}

async function resolveQaCandidate(session, explicitQaId, transaction) {
  if (explicitQaId) {
    const matches = await repo.listTimbanganDaCandidates({ qa_id: explicitQaId }, transaction);
    if (!matches.length) throw httpError(`QA_ID ${explicitQaId} not found in DA Timbangan.`, 404);
    return matches[0];
  }
  const sessionQaId = String(session?.qa_id || session?.instrument_id || '').trim();
  if (sessionQaId) {
    const matches = await repo.listTimbanganDaCandidates({ qa_id: sessionQaId }, transaction);
    if (matches.length === 1) return matches[0];
  }
  const instrumentCode = String(session?.instrument_code || '').trim();
  if (instrumentCode) {
    const candidates = await repo.listTimbanganDaCandidates({ instrument_code: instrumentCode }, transaction);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) {
      throw httpError('Multiple DA candidates found. Please choose qa_id explicitly.', 422, [
        { field: 'qa_id', message: `Candidates: ${candidates.map((c) => c.QA_ID).join(', ')}` },
      ]);
    }
  }
  throw httpError('Cannot resolve QA_ID. Provide qa_id explicitly in publish request.', 422, [
    { field: 'qa_id', message: 'No single DA Timbangan match for this session.' },
  ]);
}

// Format angka jadi label bertitel satuan, meniru konvensi input manual VBA
// (mis. "99.99994 g") — konfirmasi lewat data produksi asli, bukan tebakan.
// Dibulatkan ke 10 digit signifikan (toPrecision) untuk membuang noise floating
// point (mis. 25.000010000000003 -> "25.00001") tanpa memotong presisi asli
// input kalibrasi. String(n) berubah ke notasi eksponen untuk angka sangat
// kecil (mis. ketidakpastian ~1e-7) — dihindari dengan toFixed manual supaya
// tidak menghasilkan label seperti "1e-7 g" di sertifikat.
function numberToLabel(value, unit) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return unit ? `0 ${unit}` : '0';
  const rounded = Number(n.toPrecision(10));
  const text = Math.abs(rounded) < 1e-6
    ? rounded.toFixed(18).replace(/0+$/, '').replace(/\.$/, '')
    : String(rounded);
  return unit ? `${text} ${unit}` : text;
}

function buildSuhuKelembabanText(session, explicit) {
  if (explicit) return String(explicit);
  const t = toNumberOrNull(session.temperature);
  const h = toNumberOrNull(session.humidity);
  if (t === null && h === null) return '';
  return `${t ?? '-'}°C / ${h ?? '-'}%rH`;
}

// ---------------------------------------------------------------------------
// PUBLISH -> Sertifikat-Bagian
// ---------------------------------------------------------------------------

async function publishToSertifikat(sessionId, changedBy = null, delegatedTo = null, options = {}) {
  const pool = await repo.getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const session = await repo.getSessionById(sessionId, transaction);
    if (!session) throw httpError(`Session ${sessionId} not found.`, 404);

    const status = String(session.status || '').toUpperCase();
    if (!['CALCULATED', 'PUBLISHED'].includes(status)) {
      throw httpError(
        'Sertifikat belum bisa diterbitkan karena sesi ini belum dihitung. ' +
          'Jalankan "Hitung" sampai status menjadi CALCULATED, lalu terbitkan ulang.',
        422,
        [{ field: 'status', message: `Status sesi saat ini: ${status || 'TIDAK DIKETAHUI'}.` }]
      );
    }

    if (!session.approved_by_admin || !session.approved_by_officer || !session.approved_by_manager) {
      throw httpError(
        'Sertifikat belum bisa diterbitkan. Workbook harus di-approve oleh Admin, Officer/Supervisor, dan Manager.',
        403,
        [{ field: 'approval', message: 'Approval belum lengkap.' }]
      );
    }

    const results = await repo.getResults(sessionId, transaction);
    if (!results.length) {
      throw httpError(
        'Belum ada hasil perhitungan untuk sesi ini. Jalankan "Hitung" terlebih dahulu sebelum menerbitkan sertifikat.',
        422,
        [{ field: 'status', message: 'Tabel hasil (timbangan_results) masih kosong.' }]
      );
    }

    // Kesimpulan kelayakan dipilih manual oleh teknisi (bukan verdict otomatis).
    // Wajib dipilih sebelum sertifikat diterbitkan — mengikuti pola workbook Thermohygrometer.
    if (!normalizeEvaluationResult(session.evaluation_result)) {
      throw httpError(
        'Hasil evaluasi (kesimpulan) belum dipilih. Buka tab "Hasil & Evaluasi", pilih salah satu ' +
          'kesimpulan (Layak digunakan / Tidak layak digunakan / Penggunaan faktor koreksi), lalu terbitkan ulang.',
        422,
        [{ field: 'evaluation_result', message: 'Hasil evaluasi manual belum dipilih.' }]
      );
    }

    const qaCandidate = await resolveQaCandidate(session, options.qa_id || options.qaId, transaction);
    const qaId = String(qaCandidate.QA_ID);
    const certCode = 'M'; // T_Kalibrasi_DA_Timbangan is Timbangan-only; no Parameter_Sertifikasi check needed.

    const actor = changedBy || 'SYSTEM';
    const delegatedActor = delegatedTo || actor;

    // Nomor sertifikat — kode huruf mengikuti tabel acuan parameter kalibrasi
    // (Timbangan = M -> dbo.fnGetKal_Ser_M_No_ID). Lihat src/constants/certificateTypeCodes.js
    let idNoSertifikat = String(options.id_no_sertifikat || options.idNoSertifikat || session.id_no_sertifikat || '').trim();
    if (!idNoSertifikat) {
      if (!hasCertificateGenerator(certCode)) {
        throw httpError(
          `Generator nomor sertifikat untuk kode "${certCode}" belum tersedia di database. ` +
            `Hubungi admin untuk menambahkan dbo.fnGetKal_Ser_${certCode}_No_ID().`,
          422,
          [{ field: 'qa_id', message: `Kode sertifikat ${certCode} tanpa generator nomor sertifikat.` }]
        );
      }
      const nextNo = await repo.getNextCertificateNumberByCode(certCode, transaction);
      if (!nextNo) throw httpError('Failed to generate certificate number.', 500);
      idNoSertifikat = String(nextNo);
    }

    let header = await repo.getTimbanganCertHeader(qaId, idNoSertifikat, transaction);
    let createdDraft = false;
    if (!header) {
      const inserted = await repo.createTimbanganCertDraftFromDa(qaId, idNoSertifikat, actor, delegatedActor, transaction);
      if (!inserted) {
        throw httpError(`Failed to create sertifikat draft from DA Timbangan for QA_ID ${qaId}.`, 422, [
          { field: 'qa_id', message: `DA Timbangan record not found for QA_ID ${qaId}.` },
        ]);
      }
      createdDraft = true;
      header = await repo.getTimbanganCertHeader(qaId, idNoSertifikat, transaction);
    }
    if (!header) throw httpError(`Sertifikat header not found for QA_ID ${qaId} / ${idNoSertifikat}.`, 404);

    const metode = options.metode_kalibrasi
      || session.metode_kalibrasi
      || (await repo.getMetodeKalibrasi(transaction))
      || 'Kalibrasi Timbangan - Workbook';
    const finalInterval = toPositiveIntegerOrNull(options.interval)
      || toPositiveIntegerOrNull(session.interval_bulan)
      || toPositiveIntegerOrNull(header.Interval)
      || 12;
    const finalTglKalibrasi = toDateOrNull(options.tgl_kalibrasi) || toDateOrNull(session.calibration_date) || new Date();
    const unit = String(session.unit || 'kg');

    const summary = await repo.getSummary(sessionId, transaction);

    const headerPayload = {
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      assm_nama_instrumen: options.assm_nama_instrumen ?? session.instrument_name ?? header.Assm_nama_instrumen ?? '',
      assm_no_identitas_kalibrasi: options.assm_no_identitas_kalibrasi ?? session.instrument_code ?? header.Assm_No_identitas_kalibrasi ?? '',
      assm_merk: options.assm_merk ?? session.merk_tipe ?? header.Assm_Merk ?? '',
      serial_number: options.serial_number ?? session.no_seri ?? header.SERIAL_NUMBER ?? '',
      assm_kapasitas: options.assm_kapasitas ?? session.kapasitas_resolusi ?? header.Assm_Kapasitas ?? '',
      assm_lokasi: options.assm_lokasi ?? session.lokasi ?? header.Assm_Lokasi ?? '',
      nama: options.nama ?? session.std_nama ?? header.Nama ?? '',
      no_ident_no_batch: options.no_ident_no_batch ?? session.std_no_identitas ?? header.No_Ident_No_batch ?? '',
      no_sertifikat: options.no_sertifikat ?? session.std_no_sertifikat ?? header.No_Sertifikat ?? '',
      tertelusur_melalui: options.tertelusur_melalui ?? session.std_tertelusur ?? header.Tertelusur_melalui ?? '',
      rekalibrasi: options.rekalibrasi ?? session.std_rekalibrasi ?? header.Rekalibrasi ?? '',
      tgl_kalibrasi: finalTglKalibrasi,
      interval: finalInterval,
      metode_kalibrasi: metode,
      suhu_kelembaban: buildSuhuKelembabanText(session, options.suhu_kelembaban),
      catatan: options.catatan ?? session.keterangan ?? header.Catatan ?? '',
      batas_unjuk_kerja: summary && summary.lop !== null && summary.lop !== undefined
        ? `±${numberToLabel(summary.lop, unit)}`
        : (header.BATAS_UNJUK_KERJA ?? ''),
      user_id: actor,
      delegated_to: delegatedActor,
    };
    const updatedHeader = await repo.updateTimbanganCertHeader(headerPayload, transaction);
    if (!updatedHeader) throw httpError('Failed to update sertifikat header.', 500);

    const isOoc = normalizeEvaluationResult(session.evaluation_result) === 'Tidak layak digunakan';
    await repo.updateSertifikatTimbanganOOC(qaId, idNoSertifikat, isOoc, transaction);

    // I. Pre-Adjustment — satu baris ringkasan (mass total vs hasil pembacaan), seperti VBA.
    const preadjustRows = await repo.listPreadjust(sessionId, transaction);
    const preadjust = formula.computePreadjust(preadjustRows, unit);
    const preAdjPublishRows = preadjustRows.length
      ? [{
          seq_id: 1,
          pembacaan_standar: numberToLabel(preadjust.mass, unit),
          pembacaan_alat: numberToLabel(preadjust.result, unit),
          error: numberToLabel(preadjust.error, unit),
        }]
      : [];
    await repo.replaceTimbanganPreAdjRows(qaId, idNoSertifikat, preAdjPublishRows, actor, delegatedActor, transaction);

    // II. Daya Ulang — satu baris per kapasitas (half/max), skip yang tidak ada datanya.
    const repeatabilityRows = await repo.listRepeatability(sessionId, transaction);
    const resolusi = toNumberOrNull(session.resolusi) ?? 0;
    const rep = formula.computeRepeatability(repeatabilityRows, resolusi);
    const dayaUlangPublishRows = [];
    if (repeatabilityRows.some((r) => r.half_reading !== null && r.half_reading !== undefined)) {
      dayaUlangPublishRows.push({
        seq_id: dayaUlangPublishRows.length + 1,
        massa_standar: numberToLabel(rep.avgHalfReading, unit),
        standar_deviasi: numberToLabel(rep.srHalf, unit),
      });
    }
    if (repeatabilityRows.some((r) => r.max_reading !== null && r.max_reading !== undefined)) {
      dayaUlangPublishRows.push({
        seq_id: dayaUlangPublishRows.length + 1,
        massa_standar: numberToLabel(rep.avgMaxReading, unit),
        standar_deviasi: numberToLabel(rep.srMax, unit),
      });
    }
    await repo.replaceTimbanganDayaUlangRows(qaId, idNoSertifikat, dayaUlangPublishRows, actor, delegatedActor, transaction);

    // III. Penyimpangan dari Konvensional Massa Standar — satu baris per titik ukur.
    const sorted = [...results].sort((a, b) => Number(a.point_order) - Number(b.point_order));
    const massaStdPublishRows = sorted.map((row, index) => ({
      seq_id: index + 1,
      konvensional_standar: numberToLabel(row.konv_mass, unit),
      pembacaan_alat: numberToLabel(row.reading, unit),
      error: numberToLabel(row.error, unit),
      ketidakpastian: numberToLabel(row.u_expanded, unit),
    }));
    await repo.replaceTimbanganMassaStdRows(qaId, idNoSertifikat, massaStdPublishRows, actor, delegatedActor, transaction);

    // IV. Beban Tidak Di Pusat Pan — satu baris ringkasan dari 5 posisi eksentrisitas.
    // Kolom "0-0".."0-4" di sertifikat referensi berisi nilai KECIL dekat nol
    // (mis. "0.0000 g", "-0.0007 g"), bukan rata-rata pembacaan penuh (~100 g)
    // — dikonfirmasi dari TIMBANGAN (gr).xls (kolom "PERBEDAAN" = center - avg[i],
    // bukan kolom "RATA-RATA"). Jadi dipetakan dari `diffs`, bukan `averages`.
    // "Massa" (beban nominal) tidak dihitung dari data eksentrisitas manapun (workbook
    // referensi TIMBANGAN.xls juga tidak punya kolom itu) — diisi manual oleh teknisi
    // di form (session.eccentricity_nominal_mass), sama seperti alur VBA (txt4_Massa).
    const eccentricityRows = await repo.listEccentricity(sessionId, transaction);
    const eccentricity = formula.computeEccentricity(eccentricityRows);
    const pusatPanPublishRows = eccentricityRows.length
      ? [{
          seq_id: 1,
          massa: numberToLabel(session.eccentricity_nominal_mass, unit),
          massa_0: numberToLabel(eccentricity.diffs?.[0], unit),
          massa_1: numberToLabel(eccentricity.diffs?.[1], unit),
          massa_2: numberToLabel(eccentricity.diffs?.[2], unit),
          massa_3: numberToLabel(eccentricity.diffs?.[3], unit),
          massa_4: numberToLabel(eccentricity.diffs?.[4], unit),
          perbedaan_max: numberToLabel(eccentricity.maxDiff, unit),
        }]
      : [];
    await repo.replaceTimbanganPusatPanRows(qaId, idNoSertifikat, pusatPanPublishRows, actor, delegatedActor, transaction);

    // Endpoint print-data lama (getPrintDataTimbangan) menolak print tanpa baris approval
    // di T_Kalibrasi_Sertifikat_Timbangan_Status — mekanisme itu mendahului approval
    // role-based (admin/officer/manager) yang sudah dicek di atas, jadi begitu lolos
    // pengecekan itu di sini, otomatis tandai disetujui juga di tabel lama.
    await repo.ensureTimbanganCertApproved(qaId, idNoSertifikat, actor, delegatedActor, transaction);

    await repo.updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction);
    await repo.updateSessionStatus(sessionId, 'PUBLISHED', actor, transaction);

    await repo.insertAuditLog({
      session_id: sessionId,
      entity_name: 'timbangan_publish_sertifikat',
      entity_id: null,
      action_type: 'UPDATE',
      old_value: null,
      new_value: JSON.stringify({ qa_id: qaId, id_no_sertifikat: idNoSertifikat, rows: massaStdPublishRows.length }),
      changed_by: actor,
    }, transaction).catch(() => { /* audit optional */ });

    await transaction.commit();

    return {
      success: true,
      session_id: sessionId,
      qa_id: qaId,
      id_no_sertifikat: idNoSertifikat,
      created_new_sertifikat: createdDraft,
      published_rows: massaStdPublishRows.length,
      certificate_source: 'T_Kalibrasi_Sertifikat_Timbangan',
      certificate_approved: true,
      print_data_endpoint: `/transactions/kalibrasi/sertifikat-timbangan/print-data?qa_id=${encodeURIComponent(qaId)}&id_no_sertifikat=${encodeURIComponent(idNoSertifikat)}`,
    };
  } catch (error) {
    try { await transaction.rollback(); } catch (_) { /* keep original error */ }
    throw error;
  }
}

module.exports = {
  EVALUATION_OPTIONS,
  normalizeEvaluationResult,
  createSession,
  updateSession,
  saveWorkbook,
  calculate,
  getSessionBundle,
  getResults,
  approveSession,
  rejectSession,
  finalize,
  listAtStandards,
  lookupAt,
  listDaCandidates,
  publishToSertifikat,
};
