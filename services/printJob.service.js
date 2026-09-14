'use strict';

/**
 * Orkestrasi cetak terkontrol lewat printForm.
 *
 * Alur satu job:
 *   1. pesan jatah cetak (repository, di dalam transaksi berkunci)
 *   2. render PDF lewat pipeline sertifikat yang sudah ada
 *   3. simpan sementara + hitung sha256
 *   4. serahkan payload ke frontend untuk diteruskan ke printForm
 *   5. tutup job saat printForm melapor, lalu bukukan kuota + audit
 *
 * Catatan soal langkah 2: PDF TIDAK dirender ulang di sini. Service ini
 * memanggil endpoint `/transactions/kalibrasi/sertifikat/print` yang sudah hidup
 * dan dipakai tujuh modul di produksi. Me-refactor `printHeaderThermo` demi
 * pilot ini berarti menaruh risiko pada tujuh modul yang sedang berjalan, demi
 * satu tombol. Panggilan HTTP loopback jauh lebih murah daripada risiko itu, dan
 * PDF yang dihasilkan identik byte per byte dengan yang selama ini dicetak.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const config = require('../config/printForm.config');
const repo = require('../repositories/print-quota.repository');

const DOCUMENT_TYPE = 'sertifikat-bagian';
const RENDER_TIMEOUT_MS = 120000;
const PDF_MAGIC = Buffer.from('%PDF-');

function serviceError(message, statusCode = 500, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Perbandingan token yang waktunya tetap, supaya lama respons tidak membocorkan
 * berapa karakter awal yang sudah benar.
 */
function tokenMatches(provided, expectedHash) {
  if (!provided || !expectedHash) return false;
  const a = Buffer.from(hashToken(provided));
  const b = Buffer.from(String(expectedHash));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

function buildPreviewUrl({ printRoute, qaId, idNoSertifikat }) {
  const route = String(printRoute || '').trim();
  if (!config.allowedPrintRoutes.includes(route)) {
    throw serviceError(`Route pratinjau tidak dikenal: ${route}`, 400, 'bad_print_route');
  }

  const params = new URLSearchParams({
    qa_id: qaId || '',
    id_no_sertifikat: idNoSertifikat || '',
  });

  return `${config.feBaseUrl.replace(/\/+$/, '')}${route}?${params}`;
}

async function renderCertificatePdf({ printRoute, qaId, idNoSertifikat }) {
  const previewUrl = buildPreviewUrl({ printRoute, qaId, idNoSertifikat });

  const params = new URLSearchParams({
    link: previewUrl,
    noDoc: config.certificateDoc.noDoc,
    tanggal: config.certificateDoc.tanggal,
    revisi: config.certificateDoc.revisi,
  });

  const url = `${config.selfBaseUrl.replace(/\/+$/, '')}/transactions/kalibrasi/sertifikat/print?${params}`;

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: RENDER_TIMEOUT_MS,
    // Status apa pun diterima di sini supaya jawaban error bisa dibaca isinya;
    // kalau dibiarkan melempar, pesan aslinya hilang jadi "Request failed with
    // status code 500" saja.
    validateStatus: () => true,
  });

  if (response.status !== 200) {
    throw serviceError(
      `Gagal merender PDF sertifikat (HTTP ${response.status})`,
      502,
      'render_failed'
    );
  }

  const buffer = Buffer.from(response.data);

  // Endpoint render menjawab 200 dengan badan error pada beberapa jalur gagal.
  // Tanpa pemeriksaan ini, kegagalan baru ketahuan di printer sebagai halaman
  // berisi sampah.
  if (buffer.length < 100 || !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw serviceError('Hasil render bukan PDF yang sah', 502, 'render_not_pdf');
  }

  return buffer;
}

// -----------------------------------------------------------------------------
// Membuat job
// -----------------------------------------------------------------------------

async function createPrintJob({
  qaId,
  idNoSertifikat,
  printRoute,
  documentName,
  copies = 1,
  user,
}) {
  if (!idNoSertifikat) {
    throw serviceError('id_no_sertifikat wajib diisi', 400, 'invalid_payload');
  }

  const requestedCopies = Math.max(1, Math.min(parseInt(copies, 10) || 1, 99));
  const userId = user?.user_id || user?.inisial_user || 'unknown';
  const userName = user?.nama_user || null;

  const jobId = `PJ-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
  const downloadToken = crypto.randomBytes(32).toString('hex');
  const callbackToken = crypto.randomBytes(32).toString('hex');

  // Jatah dipesan SEBELUM PDF dirender. Rendering memakan waktu belasan detik;
  // kalau pengecekan kuota menunggu sampai selesai, dua user yang menekan Print
  // bersamaan sama-sama lolos.
  const reservation = await repo.reserveAndCreateJob({
    jobId,
    documentType: DOCUMENT_TYPE,
    qaId,
    idNoSertifikat,
    documentName: documentName || idNoSertifikat,
    userId,
    userName,
    copies: requestedCopies,
    downloadTokenHash: hashToken(downloadToken),
    callbackTokenHash: hashToken(callbackToken),
  });

  let buffer;
  try {
    buffer = await renderCertificatePdf({ printRoute, qaId, idNoSertifikat });
  } catch (error) {
    // Jatah yang sudah dipesan harus dikembalikan, kalau tidak satu kegagalan
    // render akan menghanguskan kuota user tanpa selembar kertas pun keluar.
    await repo.settleJob(jobId, {
      status: 'failed',
      errorMessage: error.message,
    });
    await repo.recordEvent({
      jobId,
      documentType: DOCUMENT_TYPE,
      documentId: reservation.documentId,
      documentName: documentName || idNoSertifikat,
      qaId,
      idNoSertifikat,
      userId,
      userName,
      copies: 0,
      status: 'failed',
      errorMessage: error.message,
    });
    throw error;
  }

  fs.mkdirSync(config.tmpDir, { recursive: true });
  const filePath = path.join(config.tmpDir, `${jobId}.pdf`);
  fs.writeFileSync(filePath, buffer, { mode: 0o600 });

  const fileHash = sha256(buffer);
  await repo.attachRenderedFile(jobId, { filePath, fileHash });

  const quota = reservation.rule;
  const publicBase = config.publicBaseUrl.replace(/\/+$/, '');

  // Alamat yang diserahkan ke printForm dicatat setiap job. Kalau ia menunjuk ke
  // backend lain, kegagalannya baru muncul di PC user sebagai 404 tanpa konteks;
  // baris ini membuat penyebabnya terbaca dari sisi server tanpa perlu menebak.
  // Token tidak ikut dicatat — ia masih hidup selama job berjalan.
  console.log(`[printForm] Job ${jobId} -> PDF di ${publicBase}/transactions/kalibrasi/print-job/${jobId}/download`);

  return {
    jobId,
    remaining: reservation.remainingAfter,
    enforce: quota.enforce,
    // Payload ini diteruskan frontend apa adanya ke printForm — bentuknya
    // mengikuti kontrak di printForm/app/src/shared/contract.js.
    job: {
      documentName: documentName || idNoSertifikat,
      documentId: `${qaId || ''}|${idNoSertifikat}`,
      pdf: {
        url: `${publicBase}/transactions/kalibrasi/print-job/${jobId}/download?token=${downloadToken}`,
      },
      sha256: fileHash,
      copiesAllowed: quota.maxCopies,
      copiesUsed: reservation.copiesUsedBefore,
      defaultCopies: requestedCopies,
      printedBy: userName || userId,
      allowPrinterChange: true,
      callbackUrl: `${publicBase}/transactions/kalibrasi/print-job/${jobId}/result`,
      callbackToken,
    },
  };
}

// -----------------------------------------------------------------------------
// Unduh PDF (dipanggil printForm, bukan browser)
// -----------------------------------------------------------------------------

async function getJobFileForDownload(jobId, token) {
  const job = await repo.getJob(jobId);
  if (!job) throw serviceError('Job tidak ditemukan', 404, 'job_not_found');

  if (!tokenMatches(token, job.download_token_hash)) {
    throw serviceError('Token unduhan tidak sah', 401, 'invalid_token');
  }
  if (job.status !== 'pending') {
    throw serviceError('Job sudah ditutup', 410, 'job_settled');
  }
  if (new Date(job.expires_at) < new Date()) {
    throw serviceError('Job sudah kedaluwarsa', 410, 'job_expired');
  }
  if (!job.file_path || !fs.existsSync(job.file_path)) {
    throw serviceError('Berkas PDF job tidak tersedia', 410, 'file_missing');
  }

  return { job, filePath: job.file_path };
}

// -----------------------------------------------------------------------------
// Laporan hasil dari printForm
// -----------------------------------------------------------------------------

async function recordJobResult(jobId, token, payload) {
  const job = await repo.getJob(jobId);
  if (!job) throw serviceError('Job tidak ditemukan', 404, 'job_not_found');

  if (!tokenMatches(token, job.callback_token_hash)) {
    // Tanpa pemeriksaan ini siapa pun bisa mengirim laporan "sudah dicetak" dan
    // menghabiskan jatah orang lain.
    throw serviceError('Token callback tidak sah', 401, 'invalid_token');
  }

  const status = ['completed', 'failed', 'cancelled'].includes(payload.status)
    ? payload.status
    : 'failed';

  const outcome = await repo.settleJob(jobId, {
    status,
    copiesPrinted: payload.copiesPrinted,
    printerName: payload.printerName,
    failedAttempts: payload.failedAttempts,
    errorMessage: payload.error || payload.lastPrintError || null,
  });

  // Berkas sementara dihapus begitu job ditutup, berhasil maupun tidak.
  cleanupJobFile(job.file_path);

  if (!outcome.settled) {
    // Laporan kedua untuk job yang sama. Bukan error dari sisi pemanggil —
    // cukup diamkan, jangan bukukan dua kali.
    return { settled: false, reason: outcome.reason };
  }

  await repo.recordEvent({
    jobId,
    documentType: job.document_type,
    documentId: job.document_id,
    documentName: job.document_name,
    qaId: job.qa_id,
    idNoSertifikat: job.id_no_sertifikat,
    userId: job.user_id,
    userName: job.user_name,
    copies: outcome.copiesPrinted,
    printerName: payload.printerName || null,
    status,
    failedAttempts: payload.failedAttempts,
    errorMessage: payload.error || payload.lastPrintError || null,
  });

  return { settled: true, copiesPrinted: outcome.copiesPrinted };
}

function cleanupJobFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Berkas temp yang tertinggal bukan alasan menggagalkan pembukuan kuota.
  }
}

// -----------------------------------------------------------------------------
// Pemeriksaan konfigurasi
// -----------------------------------------------------------------------------

/**
 * Memastikan `publicBaseUrl` benar-benar menunjuk ke backend INI.
 *
 * Alamat itu ditaruh di payload job dan dipakai printForm di PC user untuk
 * mengunduh PDF. Kalau ia menunjuk ke backend lain — misalnya masih ke server
 * produksi padahal yang dijalankan backend lokal — job tetap terbuat, kuota tetap
 * dipesan, lalu printForm gagal dengan 404 yang tidak menyebutkan sebabnya.
 *
 * Caranya tanpa menambah endpoint publik: panggil route yang butuh sesi.
 *   401 -> route-nya ada, berarti backend yang benar
 *   404 -> route tidak dikenal, berarti backend lain / versi lama
 * Perbedaan dua kode itu yang jadi alat ukurnya.
 */
async function checkPublicBaseUrl() {
  const url = `${config.publicBaseUrl.replace(/\/+$/, '')}/transactions/kalibrasi/print-job/quota`;

  let status;
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      validateStatus: () => true,
    });
    status = response.status;
  } catch (error) {
    return {
      ok: false,
      reason: 'unreachable',
      message:
        `PRINTFORM_PUBLIC_BASE_URL (${config.publicBaseUrl}) tidak bisa dihubungi ` +
        `dari backend ini (${error.code || error.message}). printForm di PC user ` +
        `akan gagal mengunduh PDF.`,
    };
  }

  if (status === 404) {
    return {
      ok: false,
      reason: 'wrong_backend',
      message:
        `PRINTFORM_PUBLIC_BASE_URL (${config.publicBaseUrl}) menjawab 404 — alamat ` +
        `itu menunjuk ke backend lain atau versi yang belum punya route print-job. ` +
        `printForm akan gagal mengunduh PDF dengan "Server PDF menjawab 404". ` +
        `Untuk backend lokal, setel PRINTFORM_PUBLIC_BASE_URL=http://127.0.0.1:${process.env.PORT || 3200}`,
    };
  }

  // 401 (butuh sesi) maupun 200 sama-sama menandakan route-nya dikenal.
  return { ok: true, status };
}

// -----------------------------------------------------------------------------
// Pemeliharaan
// -----------------------------------------------------------------------------

/**
 * Mengembalikan jatah job yang menggantung, lalu membuang berkasnya.
 *
 * Tanpa ini, satu tab yang ditutup diam-diam menahan jatah selamanya dan user
 * tidak akan pernah bisa mencetak lagi tanpa campur tangan DBA.
 */
async function sweepExpiredJobs() {
  const expired = await repo.expireStaleJobs();

  try {
    if (fs.existsSync(config.tmpDir)) {
      const cutoff = Date.now() - repo.JOB_TTL_MINUTES * 60 * 1000;
      for (const name of fs.readdirSync(config.tmpDir)) {
        const full = path.join(config.tmpDir, name);
        if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
      }
    }
  } catch (error) {
    console.warn('Gagal membersihkan tmp/print-jobs:', error.message);
  }

  return expired;
}

module.exports = {
  DOCUMENT_TYPE,
  checkPublicBaseUrl,
  // Diekspor untuk diuji: daftar putih route adalah kontrol anti-SSRF, dan
  // kontrol keamanan yang tidak diuji hanyalah harapan.
  buildPreviewUrl,
  createPrintJob,
  getJobFileForDownload,
  recordJobResult,
  sweepExpiredJobs,
  getQuotaState: (args) => repo.getQuotaState({ documentType: DOCUMENT_TYPE, ...args }),
  listEvents: (args) => repo.listEvents({ documentType: DOCUMENT_TYPE, ...args }),
};
