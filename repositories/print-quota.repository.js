'use strict';

/**
 * Akses data untuk kuota & audit cetak terkontrol (printForm).
 *
 * SELURUH SQL fitur ini ada di berkas ini dan tidak di tempat lain. Itu disengaja:
 * CLAUDE.md menyebut fitur baru memakai PostgreSQL, sementara tabel-tabel ini
 * ditulis MSSQL agar pilot tidak tertahan menunggu PG di-provision. Dengan semua
 * query terkurung di sini, pemindahan ke PG berarti menulis ulang satu berkas —
 * controller, service, dan frontend tidak ikut berubah.
 *
 * Pola kuota: reserve -> commit / release.
 * Kuota dipesan saat job dibuat, dikunci permanen setelah printForm melaporkan
 * sukses, dan dikembalikan kalau gagal/batal/kedaluwarsa. Kalau kuota langsung
 * dipotong saat tombol Print ditekan, satu printer offline sudah cukup untuk
 * membakar jatah user.
 */

const sql = require('mssql');
const { getPool } = require('./calibration-workbook.repository');

/** Jangka hidup satu job. Lewat dari ini, reservasinya dikembalikan. */
const JOB_TTL_MINUTES = 20;

function repoError(message, statusCode = 500, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

/**
 * Identitas dokumen. QA_ID dan ID_No_Sertifikat selalu dipakai berpasangan di
 * seluruh modul kalibrasi, jadi identitas dokumen pun memakai pasangan itu —
 * bukan salah satunya saja.
 */
function buildDocumentId(qaId, idNoSertifikat) {
  return `${String(qaId || '').trim()}|${String(idNoSertifikat || '').trim()}`;
}

// -----------------------------------------------------------------------------
// Aturan
// -----------------------------------------------------------------------------

async function getRule(documentType) {
  const pool = await getPool();
  const result = await pool.request()
    .input('DocumentType', sql.VarChar(50), documentType)
    .query(`
      SELECT TOP 1 rule_id, document_type, max_copies, scope, enforce, is_active
      FROM dbo.print_quota_rules
      WHERE document_type = @DocumentType AND is_active = 1
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    ruleId: row.rule_id,
    documentType: row.document_type,
    maxCopies: row.max_copies,
    scope: row.scope,
    enforce: Boolean(row.enforce),
  };
}

/** scope_key kosong berarti kuota berlaku untuk dokumen, bukan per user. */
function resolveScopeKey(rule, userId) {
  return rule.scope === 'per_document_per_user' ? String(userId || '').slice(0, 100) : '';
}

// -----------------------------------------------------------------------------
// Pembacaan kuota (untuk ditampilkan di UI)
// -----------------------------------------------------------------------------

async function getQuotaState({ documentType, qaId, idNoSertifikat, userId }) {
  const rule = await getRule(documentType);
  if (!rule) {
    return { registered: false, reason: 'no_rule', enforce: false };
  }

  const documentId = buildDocumentId(qaId, idNoSertifikat);
  const scopeKey = resolveScopeKey(rule, userId);

  const pool = await getPool();
  const result = await pool.request()
    .input('DocumentType', sql.VarChar(50), documentType)
    .input('DocumentId', sql.NVarChar(128), documentId)
    .input('ScopeKey', sql.VarChar(100), scopeKey)
    .query(`
      SELECT TOP 1 copies_committed, copies_reserved
      FROM dbo.print_quota_ledger
      WHERE document_type = @DocumentType
        AND document_id = @DocumentId
        AND scope_key = @ScopeKey
    `);

  const row = result.recordset[0] || { copies_committed: 0, copies_reserved: 0 };
  const used = row.copies_committed;
  const held = row.copies_reserved;
  const remaining = Math.max(0, rule.maxCopies - used - held);

  return {
    registered: true,
    enforce: rule.enforce,
    scope: rule.scope,
    maxCopies: rule.maxCopies,
    copiesUsed: used,
    copiesReserved: held,
    remaining,
  };
}

// -----------------------------------------------------------------------------
// reserve
// -----------------------------------------------------------------------------

/**
 * Memesan jatah dan membuat baris job dalam satu transaksi.
 *
 * Baris ledger dikunci dengan UPDLOCK + HOLDLOCK. HOLDLOCK penting justru ketika
 * barisnya BELUM ADA: ia menahan range lock pada kunci itu, sehingga dua request
 * bersamaan untuk sertifikat yang sama tidak bisa sama-sama menyisipkan baris
 * awal lalu sama-sama merasa jatahnya masih penuh.
 *
 * @throws error ber-`code` 'quota_exhausted' (409) bila jatah tidak cukup
 */
async function reserveAndCreateJob({
  jobId,
  documentType,
  qaId,
  idNoSertifikat,
  documentName,
  userId,
  userName,
  copies,
  downloadTokenHash,
  callbackTokenHash,
}) {
  const rule = await getRule(documentType);
  if (!rule) {
    throw repoError(`Tidak ada aturan kuota aktif untuk '${documentType}'`, 500, 'no_rule');
  }

  const documentId = buildDocumentId(qaId, idNoSertifikat);
  const scopeKey = resolveScopeKey(rule, userId);

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const lockReq = new sql.Request(transaction);
    const current = await lockReq
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('DocumentId', sql.NVarChar(128), documentId)
      .input('ScopeKey', sql.VarChar(100), scopeKey)
      .query(`
        SELECT copies_committed, copies_reserved
        FROM dbo.print_quota_ledger WITH (UPDLOCK, HOLDLOCK)
        WHERE document_type = @DocumentType
          AND document_id = @DocumentId
          AND scope_key = @ScopeKey
      `);

    let used = 0;
    let held = 0;
    const ledgerExists = current.recordset.length > 0;

    if (ledgerExists) {
      used = current.recordset[0].copies_committed;
      held = current.recordset[0].copies_reserved;
    }

    const remaining = rule.maxCopies - used - held;

    // enforce = 0 berarti fase pengenalan: semua tetap dicatat, tapi tidak ada
    // yang ditolak. Kuota tetap dibukukan supaya angkanya siap dipakai begitu
    // penegakan dinyalakan.
    if (rule.enforce && remaining < copies) {
      await transaction.rollback();

      // Jatah bisa habis karena dua sebab yang sangat berbeda, dan pesannya harus
      // membedakannya. Kalau hanya `used` yang disebut, job yang masih menahan
      // reservasi menghasilkan kalimat yang menyanggah dirinya sendiri —
      // "terpakai 0 dari 2" padahal ditolak — dan orang akan mencari masalahnya
      // di aturan kuota, tempat yang salah.
      const detail = held > 0
        ? `terpakai ${used}, ${held} sedang ditahan job yang belum selesai, dari ${rule.maxCopies}`
        : `terpakai ${used} dari ${rule.maxCopies}`;

      throw repoError(`Jatah cetak habis (${detail})`, 409, 'quota_exhausted');
    }

    const upsertReq = new sql.Request(transaction);
    upsertReq
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('DocumentId', sql.NVarChar(128), documentId)
      .input('ScopeKey', sql.VarChar(100), scopeKey)
      .input('Copies', sql.Int, copies);

    if (ledgerExists) {
      await upsertReq.query(`
        UPDATE dbo.print_quota_ledger
        SET copies_reserved = copies_reserved + @Copies,
            updated_at = GETDATE()
        WHERE document_type = @DocumentType
          AND document_id = @DocumentId
          AND scope_key = @ScopeKey
      `);
    } else {
      await upsertReq.query(`
        INSERT INTO dbo.print_quota_ledger
          (document_type, document_id, scope_key, copies_committed, copies_reserved)
        VALUES (@DocumentType, @DocumentId, @ScopeKey, 0, @Copies)
      `);
    }

    const jobReq = new sql.Request(transaction);
    await jobReq
      .input('JobId', sql.VarChar(64), jobId)
      .input('DocumentType', sql.VarChar(50), documentType)
      .input('DocumentId', sql.NVarChar(128), documentId)
      .input('ScopeKey', sql.VarChar(100), scopeKey)
      .input('DocumentName', sql.NVarChar(200), documentName || null)
      .input('QaId', sql.NVarChar(50), qaId || null)
      .input('IdNoSertifikat', sql.NVarChar(50), idNoSertifikat || null)
      .input('UserId', sql.VarChar(100), String(userId || '').slice(0, 100))
      .input('UserName', sql.NVarChar(150), userName || null)
      .input('Copies', sql.Int, copies)
      .input('DownloadTokenHash', sql.VarChar(64), downloadTokenHash || null)
      .input('CallbackTokenHash', sql.VarChar(64), callbackTokenHash || null)
      .input('TtlMinutes', sql.Int, JOB_TTL_MINUTES)
      .query(`
        INSERT INTO dbo.printform_jobs
          (job_id, document_type, document_id, scope_key, document_name,
           qa_id, id_no_sertifikat, user_id, user_name, copies_reserved,
           download_token_hash, callback_token_hash, status, expires_at)
        VALUES
          (@JobId, @DocumentType, @DocumentId, @ScopeKey, @DocumentName,
           @QaId, @IdNoSertifikat, @UserId, @UserName, @Copies,
           @DownloadTokenHash, @CallbackTokenHash, 'pending',
           DATEADD(MINUTE, @TtlMinutes, GETDATE()))
      `);

    await transaction.commit();

    return {
      jobId,
      documentId,
      scopeKey,
      rule,
      copiesUsedBefore: used,
      remainingAfter: Math.max(0, rule.maxCopies - used - held - copies),
    };
  } catch (error) {
    // Rollback pada transaksi yang sudah di-rollback melempar lagi dan menutupi
    // error aslinya; itu sebabnya kegagalan rollback sengaja ditelan.
    try { await transaction.rollback(); } catch { /* sudah ter-rollback */ }
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Setelah PDF jadi
// -----------------------------------------------------------------------------

async function attachRenderedFile(jobId, { filePath, fileHash }) {
  const pool = await getPool();
  await pool.request()
    .input('JobId', sql.VarChar(64), jobId)
    .input('FilePath', sql.NVarChar(500), filePath)
    .input('FileHash', sql.VarChar(64), fileHash)
    .query(`
      UPDATE dbo.printform_jobs
      SET file_path = @FilePath, file_hash = @FileHash
      WHERE job_id = @JobId
    `);
}

async function getJob(jobId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('JobId', sql.VarChar(64), jobId)
    .query(`SELECT TOP 1 * FROM dbo.printform_jobs WHERE job_id = @JobId`);
  return result.recordset[0] || null;
}

// -----------------------------------------------------------------------------
// settle: commit / release
// -----------------------------------------------------------------------------

/**
 * Menutup job sekali untuk selamanya, lalu membukukan kuotanya.
 *
 * `WHERE status = 'pending'` membuat fungsi ini idempoten: laporan yang datang
 * dua kali — entah karena printForm mengirim ulang atau jaringan menggandakan —
 * hanya berpengaruh pada yang pertama. Tanpa penjagaan itu, laporan kedua akan
 * melepas reservasi untuk kedua kalinya dan kuota jadi bocor.
 *
 * @returns {Promise<{settled: boolean, job: object|null}>}
 */
async function settleJob(jobId, { status, copiesPrinted = 0, printerName = null, failedAttempts = 0, errorMessage = null }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const lockReq = new sql.Request(transaction);
    const jobResult = await lockReq
      .input('JobId', sql.VarChar(64), jobId)
      .query(`
        SELECT * FROM dbo.printform_jobs WITH (UPDLOCK, ROWLOCK)
        WHERE job_id = @JobId
      `);

    const job = jobResult.recordset[0];
    if (!job) {
      await transaction.rollback();
      return { settled: false, job: null, reason: 'not_found' };
    }
    if (job.status !== 'pending') {
      await transaction.rollback();
      return { settled: false, job, reason: 'already_settled' };
    }

    // Yang dibukukan adalah jumlah yang benar-benar tercetak menurut laporan,
    // dibatasi jatah yang dipesan — bukan jumlah pesanan. Kalau user menurunkan
    // spinner Copies dari 2 ke 1, yang terpotong satu.
    const printed = status === 'completed'
      ? Math.max(0, Math.min(parseInt(copiesPrinted, 10) || 0, job.copies_reserved))
      : 0;

    const updateJobReq = new sql.Request(transaction);
    await updateJobReq
      .input('JobId', sql.VarChar(64), jobId)
      .input('Status', sql.VarChar(20), status)
      .input('CopiesPrinted', sql.Int, printed)
      .input('PrinterName', sql.NVarChar(255), printerName)
      .input('FailedAttempts', sql.Int, parseInt(failedAttempts, 10) || 0)
      .input('ErrorMessage', sql.NVarChar(500), errorMessage ? String(errorMessage).slice(0, 500) : null)
      .query(`
        UPDATE dbo.printform_jobs
        SET status = @Status,
            copies_printed = @CopiesPrinted,
            printer_name = @PrinterName,
            failed_attempts = @FailedAttempts,
            error_message = @ErrorMessage,
            settled_at = GETDATE()
        WHERE job_id = @JobId AND status = 'pending'
      `);

    const ledgerReq = new sql.Request(transaction);
    await ledgerReq
      .input('DocumentType', sql.VarChar(50), job.document_type)
      .input('DocumentId', sql.NVarChar(128), job.document_id)
      .input('ScopeKey', sql.VarChar(100), job.scope_key)
      .input('Reserved', sql.Int, job.copies_reserved)
      .input('Printed', sql.Int, printed)
      .query(`
        UPDATE dbo.print_quota_ledger
        SET copies_reserved  = CASE WHEN copies_reserved - @Reserved < 0
                                    THEN 0 ELSE copies_reserved - @Reserved END,
            copies_committed = copies_committed + @Printed,
            updated_at = GETDATE()
        WHERE document_type = @DocumentType
          AND document_id = @DocumentId
          AND scope_key = @ScopeKey
      `);

    await transaction.commit();

    return {
      settled: true,
      job: { ...job, status, copies_printed: printed, printer_name: printerName },
      copiesPrinted: printed,
    };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* sudah ter-rollback */ }
    throw error;
  }
}

/**
 * Mengembalikan reservasi job yang sudah lewat masa hidupnya.
 *
 * Tanpa ini, satu tab yang ditutup diam-diam akan menahan jatah selamanya dan
 * user tidak akan pernah bisa mencetak lagi tanpa intervensi DBA.
 */
async function expireStaleJobs() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT job_id FROM dbo.printform_jobs
    WHERE status = 'pending' AND expires_at < GETDATE()
  `);

  let expired = 0;
  for (const row of result.recordset) {
    const outcome = await settleJob(row.job_id, {
      status: 'expired',
      errorMessage: 'Job kedaluwarsa tanpa laporan hasil',
    });
    if (outcome.settled) expired += 1;
  }
  return expired;
}

// -----------------------------------------------------------------------------
// Audit
// -----------------------------------------------------------------------------

async function recordEvent(event) {
  const pool = await getPool();
  await pool.request()
    .input('JobId', sql.VarChar(64), event.jobId || null)
    .input('DocumentType', sql.VarChar(50), event.documentType)
    .input('DocumentId', sql.NVarChar(128), event.documentId)
    .input('DocumentName', sql.NVarChar(200), event.documentName || null)
    .input('QaId', sql.NVarChar(50), event.qaId || null)
    .input('IdNoSertifikat', sql.NVarChar(50), event.idNoSertifikat || null)
    .input('UserId', sql.VarChar(100), event.userId || null)
    .input('UserName', sql.NVarChar(150), event.userName || null)
    .input('Copies', sql.Int, parseInt(event.copies, 10) || 0)
    .input('PrinterName', sql.NVarChar(255), event.printerName || null)
    .input('Status', sql.VarChar(20), event.status)
    .input('FailedAttempts', sql.Int, parseInt(event.failedAttempts, 10) || 0)
    .input('ErrorMessage', sql.NVarChar(500), event.errorMessage ? String(event.errorMessage).slice(0, 500) : null)
    .query(`
      INSERT INTO dbo.print_events
        (job_id, document_type, document_id, document_name, qa_id, id_no_sertifikat,
         user_id, user_name, copies, printer_name, status, failed_attempts, error_message)
      VALUES
        (@JobId, @DocumentType, @DocumentId, @DocumentName, @QaId, @IdNoSertifikat,
         @UserId, @UserName, @Copies, @PrinterName, @Status, @FailedAttempts, @ErrorMessage)
    `);
}

async function listEvents({ documentType, qaId, idNoSertifikat, limit = 50 }) {
  const pool = await getPool();
  const request = pool.request()
    .input('DocumentType', sql.VarChar(50), documentType)
    .input('Limit', sql.Int, Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500));

  let where = 'document_type = @DocumentType';
  if (qaId && idNoSertifikat) {
    request.input('DocumentId', sql.NVarChar(128), buildDocumentId(qaId, idNoSertifikat));
    where += ' AND document_id = @DocumentId';
  }

  const result = await request.query(`
    SELECT TOP (@Limit)
      event_id, job_id, document_name, qa_id, id_no_sertifikat,
      user_id, user_name, copies, printer_name, status,
      failed_attempts, error_message, created_at
    FROM dbo.print_events
    WHERE ${where}
    ORDER BY created_at DESC, event_id DESC
  `);

  return result.recordset;
}

module.exports = {
  JOB_TTL_MINUTES,
  buildDocumentId,
  getRule,
  getQuotaState,
  reserveAndCreateJob,
  attachRenderedFile,
  getJob,
  settleJob,
  expireStaleJobs,
  recordEvent,
  listEvents,
};
