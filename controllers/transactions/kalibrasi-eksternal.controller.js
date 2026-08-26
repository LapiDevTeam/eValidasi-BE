'use strict';

const path = require('path');
const fs = require('fs');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { getApproverIdentity, formatDateForSQL } = require('../../helpers/kalibrasi.helper');
const {
  uploadFileToFTP,
  downloadFileFromFTP,
  deleteFileFromFTP,
  FTP_CONFIG,
} = require('../../helpers/ftp.helper');

const PROGRAM_NAME = 'KalibrasiEksternal';
const APP_CODE = 'KAL_Eksternal';

// Base directory used by uploadPublicV2 (controllers/v2/upload.controller.js).
// Sejak sertifikat disimpan di FTP, folder ini hanya dipakai sebagai staging
// sementara oleh multer sebelum file dikirim ke FTP.
const UPLOAD_BASE_DIR = path.join('C:', 'publicuploads', PROGRAM_NAME);

// Folder tmp untuk menampung file yang di-GET dari FTP sebelum dikirim ke browser.
const TEMP_DOWNLOAD_DIR = path.join(__dirname, '../../tmp');

// Penanda di kolom sertifikat_vendor_path bahwa file berada di FTP, bukan di disk lokal.
// Record lama (sebelum fix ini) menyimpan path lokal absolut, jadi keduanya harus didukung.
const FTP_PATH_PREFIX = 'ftp://';

const isFtpStoredPath = (storedPath) =>
  typeof storedPath === 'string' && storedPath.toLowerCase().startsWith(FTP_PATH_PREFIX);

const buildFtpStoredPath = (remoteFileName) =>
  `${FTP_PATH_PREFIX}${FTP_CONFIG.host}/${FTP_CONFIG.folder}/${remoteFileName}`;

/**
 * Nama file di FTP dibuat deterministik per record supaya:
 *  - mudah ditelusuri manual di server FTP (tidak berupa hash md5 seperti sebelumnya),
 *  - upload ulang menimpa file lama, tidak menumpuk sampah.
 * Contoh: EKST_1042_QA-01-123.pdf
 */
const buildRemoteFileName = (ekstId, qaId, originalFileName) => {
  const ext = (path.extname(originalFileName || '') || '.pdf').toLowerCase();
  const safeQaId = String(qaId || 'NOQA').replace(/[^A-Za-z0-9._-]/g, '_');

  return `EKST_${ekstId}_${safeQaId}${ext}`;
};

// Status yang sudah final — sertifikat tidak boleh dihapus lagi
const LOCKED_STATUSES = ['APPROVED', 'TIDAK_DAPAT_APPROVED', 'LABEL_TEMPEL'];

/**
 * Best-effort physical file removal.
 * Only removes files that live inside UPLOAD_BASE_DIR (guards against path traversal
 * and against deleting legacy paths pointing elsewhere on the server).
 */
const removeUploadedFile = async (filePath) => {
  if (!filePath) {
    return false;
  }

  try {
    const resolved = path.resolve(filePath);
    const base = path.resolve(UPLOAD_BASE_DIR);

    if (resolved.toLowerCase().indexOf(base.toLowerCase() + path.sep) !== 0) {
      console.warn('removeUploadedFile: skipped file outside upload dir ->', resolved);
      return false;
    }

    await fs.promises.unlink(resolved);

    return true;
  } catch (error) {
    // ENOENT = file sudah tidak ada, bukan kondisi error untuk user
    if (error.code !== 'ENOENT') {
      console.error('removeUploadedFile error:', error);
    }

    return false;
  }
};

/**
 * Best-effort cleanup untuk file tmp hasil download dari FTP.
 */
const removeTempDownload = async (filePath) => {
  if (!filePath) {
    return false;
  }

  try {
    await fs.promises.unlink(filePath);

    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('removeTempDownload error:', error);
    }

    return false;
  }
};

/**
 * Resolves the owning department for a Kalibrasi Eksternal record.
 * Accepts either a schedule_detail_id (T_Monthly_Schedule_External_Detail)
 * or an ekst_id (T_Kalibrasi_Eksternal).
 * Returns the department string, or null if not found or if user is VN/no dept filter.
 */
const getOwningDepartment = async (identifier, bagian_user) => {
  if (!bagian_user || bagian_user === 'VN') {
    return null;
  }

  // Try schedule_detail_id first
  let result = await sequelizeMSQL.query(
    `SELECT Department FROM T_Monthly_Schedule_External_Detail
     WHERE Schedule_External_Detail_ID = :identifier`,
    { replacements: { identifier }, type: Sequelize.QueryTypes.SELECT }
  );

  if (result.length) {
    return result[0].Department;
  }

  // Try ekst_id via join
  result = await sequelizeMSQL.query(
    `SELECT d.Department
     FROM T_Kalibrasi_Eksternal e
     INNER JOIN T_Monthly_Schedule_External_Detail d
       ON e.schedule_detail_id = d.Schedule_External_Detail_ID
     WHERE e.ekst_id = :identifier`,
    { replacements: { identifier }, type: Sequelize.QueryTypes.SELECT }
  );

  return result[0]?.Department || null;
};

/**
 * GET /list
 * Lists instruments from APPROVED external schedules, joined with execution status.
 * Query params: tahun, bulan (optional), status (optional: DRAFT|UPLOADED|APPROVED|REJECTED|
 *               TIDAK_DAPAT|TIDAK_DAPAT_REJECTED|TIDAK_DAPAT_APPROVED|LABEL_TEMPEL|PENDING)
 */
const getKalibrasiEksternalList = async (req, res, next) => {
  try {
    const { bagian_user } = req.user;
    const { tahun, bulan, status } = req.query;

    const yearFilter = tahun || moment().utcOffset(7).year().toString();

    let query = `
      SELECT
        d.Schedule_External_Detail_ID  AS schedule_detail_id,
        d.Schedule_External_Header_ID  AS schedule_header_id,
        d.Schedule_Period_Year         AS tahun,
        d.Schedule_Period_Month        AS bulan,
        d.QA_ID                        AS qa_id,
        d.Instrument_Name              AS nama_alat,
        d.Instrument_ID                AS instrument_id,
        d.Department                   AS departemen,
        d.Location                     AS lokasi,
        d.Due_Date                     AS tgl_jatuh_tempo,
        -- Execution record (may be NULL if not yet started)
        e.ekst_id,
        e.vendor_id,
        v.nama_vendor,
        v.kode_vendor,
        v.terdaftar_pg                 AS vendor_terdaftar_pg,
        e.no_pp,
        e.tgl_pp,
        e.tgl_pelaksanaan,
        e.hasil_kalibrasi,
        e.sertifikat_vendor_filename,
        ISNULL(e.status, 'PENDING')    AS status,
        e.catatan,
        e.is_tidak_dapat,
        e.alasan_tidak_dapat,
        -- Approval info
        s.USER_ID                      AS approver_user_id,
        s.nama_approver,
        s.process_date                 AS tgl_approve,
        s.status                       AS status_approve,
        s.catatan                      AS catatan_approve
      FROM T_Monthly_Schedule_External_Detail d
      INNER JOIN T_Monthly_Schedule_External_Header h
        ON d.Schedule_External_Header_ID = h.Schedule_External_Header_ID
        AND h.Status = 'APPROVED'
      LEFT JOIN T_Kalibrasi_Eksternal e
        ON e.schedule_detail_id = d.Schedule_External_Detail_ID
      LEFT JOIN T_Kalibrasi_Master_Vendor v
        ON e.vendor_id = v.vendor_id
      LEFT JOIN T_Kalibrasi_Eksternal_Status s
        ON s.ekst_id = e.ekst_id AND s.approver_no = 1
      WHERE d.Schedule_Period_Year = :tahun
    `;

    const replacements = { tahun: yearFilter };

    if (bagian_user && bagian_user !== 'VN') {
      query += ` AND d.Department = :bagian_user`;
      replacements.bagian_user = bagian_user;
    }

    if (bulan) {
      query += ` AND d.Schedule_Period_Month = :bulan`;
      replacements.bulan = bulan;
    }

    if (status && status !== 'SEMUA') {
      if (status === 'PENDING') {
        query += ` AND e.ekst_id IS NULL`;
      } else if (status === 'TIDAK_DAPAT_REJECTED') {
        // Ditolak MGR: status record sudah dikembalikan ke TIDAK_DAPAT, penandanya
        // baris approval REJECT. TIDAK_DAPAT_REJECTED tetap dicek untuk data lama.
        query += ` AND (e.status = 'TIDAK_DAPAT_REJECTED' OR (e.status = 'TIDAK_DAPAT' AND s.status = 'REJECT'))`;
      } else if (status === 'TIDAK_DAPAT') {
        query += ` AND e.status = 'TIDAK_DAPAT' AND (s.status IS NULL OR s.status <> 'REJECT')`;
      } else {
        query += ` AND e.status = :status`;
        replacements.status = status;
      }
    }

    query += ` ORDER BY d.Schedule_Period_Year DESC, d.Schedule_Period_Month DESC, d.Line_No ASC`;

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in getKalibrasiEksternalList:', error);
    next(error);
  }
};

/**
 * GET /detail
 * Returns a single execution record plus its schedule detail info.
 * Query params: schedule_detail_id (required)
 */
const getKalibrasiEksternalDetail = async (req, res, next) => {
  try {
    const { bagian_user } = req.user;
    const { schedule_detail_id } = req.query;

    if (!schedule_detail_id) {
      const err = new Error('schedule_detail_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const query = `
      SELECT
        d.Schedule_External_Detail_ID  AS schedule_detail_id,
        d.Schedule_External_Header_ID  AS schedule_header_id,
        d.Schedule_Period_Year         AS tahun,
        d.Schedule_Period_Month        AS bulan,
        d.QA_ID                        AS qa_id,
        d.Instrument_Name              AS nama_alat,
        d.Instrument_ID                AS instrument_id,
        d.Department                   AS departemen,
        d.Location                     AS lokasi,
        CONVERT(nvarchar, d.Due_Date, 23) AS tgl_jatuh_tempo,
        e.ekst_id,
        e.vendor_id,
        v.nama_vendor,
        v.kode_vendor,
        e.terdaftar_pg,
        e.no_fo_pg,
        e.no_penawaran,
        CONVERT(nvarchar, e.tgl_penawaran, 23) AS tgl_penawaran,
        e.no_pp,
        CONVERT(nvarchar, e.tgl_pp, 23) AS tgl_pp,
        CONVERT(nvarchar, e.tgl_kirim_alat, 23) AS tgl_kirim_alat,
        CONVERT(nvarchar, e.tgl_terima_balik, 23) AS tgl_terima_balik,
        CONVERT(nvarchar, e.tgl_pelaksanaan, 23) AS tgl_pelaksanaan,
        e.hasil_kalibrasi,
        e.sertifikat_vendor_filename,
        e.sertifikat_vendor_path,
        e.catatan,
        ISNULL(e.status, 'PENDING') AS status,
        e.is_tidak_dapat,
        e.alasan_tidak_dapat,
        e.kondisi_alat,
        CONVERT(nvarchar, e.tgl_label_tempel, 120) AS tgl_label_tempel,
        e.label_tempel_by,
        e.created_by,
        CONVERT(nvarchar, e.created_date, 106) AS created_date,
        e.updated_by,
        CONVERT(nvarchar, e.updated_date, 106) AS updated_date,
        s.USER_ID      AS approver_user_id,
        s.nama_approver,
        CONVERT(nvarchar, s.process_date, 106) AS tgl_approve,
        s.status       AS status_approve,
        s.catatan      AS catatan_approve
      FROM T_Monthly_Schedule_External_Detail d
      LEFT JOIN T_Kalibrasi_Eksternal e
        ON e.schedule_detail_id = d.Schedule_External_Detail_ID
      LEFT JOIN T_Kalibrasi_Master_Vendor v
        ON e.vendor_id = v.vendor_id
      LEFT JOIN T_Kalibrasi_Eksternal_Status s
        ON s.ekst_id = e.ekst_id AND s.approver_no = 1
      WHERE d.Schedule_External_Detail_ID = :schedule_detail_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { schedule_detail_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!results.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (bagian_user && bagian_user !== 'VN' && results[0].departemen !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results[0],
    });
  } catch (error) {
    console.error('Error in getKalibrasiEksternalDetail:', error);
    next(error);
  }
};

/**
 * POST /save
 * Create or update an execution record.
 * Vendor selection is no longer required or validated.
 * Body: schedule_detail_id, ekst_id (null = create),
 *       no_penawaran, tgl_penawaran, no_pp, tgl_pp,
 *       tgl_kirim_alat, tgl_terima_balik, tgl_pelaksanaan, hasil_kalibrasi, catatan
 */
const saveKalibrasiEksternal = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const {
      schedule_detail_id,
      ekst_id,
      vendor_id,
      terdaftar_pg,
      no_fo_pg,
      no_penawaran,
      tgl_penawaran,
      no_pp,
      tgl_pp,
      tgl_kirim_alat,
      tgl_terima_balik,
      tgl_pelaksanaan,
      hasil_kalibrasi,
      catatan,
    } = req.body;

    if (!schedule_detail_id) {
      const err = new Error('schedule_detail_id wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard: create uses schedule_detail_id, update uses ekst_id
    const ownerDept = await getOwningDepartment(!ekst_id ? schedule_detail_id : ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (!ekst_id) {
      // Check if record already exists for this schedule detail
      const checkQuery = `
        SELECT COUNT(*) AS cnt FROM T_Kalibrasi_Eksternal
        WHERE schedule_detail_id = :schedule_detail_id
      `;
      const checkResult = await sequelizeMSQL.query(checkQuery, {
        replacements: { schedule_detail_id },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (checkResult[0]?.cnt > 0) {
        const err = new Error('Record kalibrasi eksternal untuk alat ini sudah ada');

        err.statusCode = 400;

        res.status(400).json({ success: false, message: err.message });

        next(err);

        return;
      }

      const insertQuery = `
        INSERT INTO T_Kalibrasi_Eksternal
          (schedule_detail_id, vendor_id, terdaftar_pg, no_fo_pg, no_penawaran, tgl_penawaran,
           no_pp, tgl_pp, tgl_kirim_alat, tgl_terima_balik, tgl_pelaksanaan,
           hasil_kalibrasi, catatan, status, created_by, created_date)
        VALUES
          (:schedule_detail_id, :vendor_id, :terdaftar_pg, :no_fo_pg, :no_penawaran, :tgl_penawaran,
           :no_pp, :tgl_pp, :tgl_kirim_alat, :tgl_terima_balik, :tgl_pelaksanaan,
           :hasil_kalibrasi, :catatan, 'DRAFT', :created_by, SYSDATETIME())
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          schedule_detail_id,
          vendor_id: vendor_id || null,
          terdaftar_pg: terdaftar_pg ? 1 : 0,
          no_fo_pg: no_fo_pg || null,
          no_penawaran: no_penawaran || null,
          tgl_penawaran: formatDateForSQL(tgl_penawaran),
          no_pp: no_pp || null,
          tgl_pp: formatDateForSQL(tgl_pp),
          tgl_kirim_alat: formatDateForSQL(tgl_kirim_alat),
          tgl_terima_balik: formatDateForSQL(tgl_terima_balik),
          tgl_pelaksanaan: formatDateForSQL(tgl_pelaksanaan),
          hasil_kalibrasi: hasil_kalibrasi || null,
          catatan: catatan || null,
          created_by: user_id,
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(200).json({ success: true, message: 'Data berhasil disimpan' });
    }

    // Update existing — cannot edit if APPROVED
    const statusCheck = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );
    if (statusCheck[0]?.status === 'APPROVED') {
      const err = new Error('Data yang sudah disetujui tidak dapat diedit');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const updateQuery = `
      UPDATE T_Kalibrasi_Eksternal
      SET
        vendor_id        = :vendor_id,
        terdaftar_pg     = :terdaftar_pg,
        no_fo_pg         = :no_fo_pg,
        no_penawaran     = :no_penawaran,
        tgl_penawaran    = :tgl_penawaran,
        no_pp            = :no_pp,
        tgl_pp           = :tgl_pp,
        tgl_kirim_alat   = :tgl_kirim_alat,
        tgl_terima_balik = :tgl_terima_balik,
        tgl_pelaksanaan  = :tgl_pelaksanaan,
        hasil_kalibrasi  = :hasil_kalibrasi,
        catatan          = :catatan,
        updated_by       = :updated_by,
        updated_date     = SYSDATETIME()
      WHERE ekst_id = :ekst_id
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        ekst_id,
        vendor_id: vendor_id || null,
        terdaftar_pg: terdaftar_pg ? 1 : 0,
        no_fo_pg: no_fo_pg || null,
        no_penawaran: no_penawaran || null,
        tgl_penawaran: formatDateForSQL(tgl_penawaran),
        no_pp: no_pp || null,
        tgl_pp: formatDateForSQL(tgl_pp),
        tgl_kirim_alat: formatDateForSQL(tgl_kirim_alat),
        tgl_terima_balik: formatDateForSQL(tgl_terima_balik),
        tgl_pelaksanaan: formatDateForSQL(tgl_pelaksanaan),
        hasil_kalibrasi: hasil_kalibrasi || null,
        catatan: catatan || null,
        updated_by: user_id,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Data berhasil diperbarui' });
  } catch (error) {
    console.error('Error in saveKalibrasiEksternal:', error);
    next(error);
  }
};

/**
 * DELETE /delete
 * Delete an execution record (only if status is DRAFT).
 * Query params: ekst_id (required)
 */
const deleteKalibrasiEksternal = async (req, res, next) => {
  try {
    const { bagian_user } = req.user;
    const { ekst_id } = req.query;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const statusCheck = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (!statusCheck.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (statusCheck[0]?.status !== 'DRAFT') {
      const err = new Error('Hanya data berstatus DRAFT yang dapat dihapus');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.DELETE }
    );

    return res.status(200).json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error) {
    console.error('Error in deleteKalibrasiEksternal:', error);
    next(error);
  }
};

/**
 * POST /upload-sertifikat
 * Upload vendor certificate file for an eksternal record.
 * Multer middleware runs before this handler (via router).
 * Body (after multer): ekst_id, file path set by uploadPublicV2
 *
 * Alur: multer simpan sementara di UPLOAD_BASE_DIR -> kirim ke FTP (folder eKalibrasi)
 * -> hapus file sementara -> simpan nama file FTP di DB.
 * Sama dengan modul kalibrasi lain (permohonan, DA, dst) yang memang bertumpu ke FTP.
 */
const uploadSertifikatVendor = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const { ekst_id } = req.body;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (!req.file) {
      const err = new Error('File tidak ditemukan');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // File sementara hasil multer (nama file = hash md5, tanpa ekstensi asli)
    const ext = path.extname(req.file.originalname);
    const stagedFilePath = path.resolve(req.body.path || req.file.path);

    // Verify the record exists and is editable
    const statusCheck = await sequelizeMSQL.query(
      `SELECT e.status, d.QA_ID AS qa_id
       FROM T_Kalibrasi_Eksternal e
       LEFT JOIN T_Monthly_Schedule_External_Detail d
         ON e.schedule_detail_id = d.Schedule_External_Detail_ID
       WHERE e.ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (!statusCheck.length) {
      await removeUploadedFile(stagedFilePath);

      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (statusCheck[0]?.status === 'APPROVED') {
      await removeUploadedFile(stagedFilePath);

      const err = new Error('Data yang sudah disetujui tidak dapat diubah');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (!fs.existsSync(stagedFilePath)) {
      const err = new Error('File hasil unggahan tidak ditemukan di server');

      err.statusCode = 500;

      res.status(500).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Kirim ke FTP — inilah langkah yang sebelumnya hilang sehingga file
    // hanya menumpuk di disk lokal server dan tidak pernah muncul di FTP.
    const filename = buildRemoteFileName(ekst_id, statusCheck[0]?.qa_id, req.file.originalname);
    const uploadResult = await uploadFileToFTP(stagedFilePath, filename);

    // Staging file selalu dibersihkan, sukses maupun gagal.
    await removeUploadedFile(stagedFilePath);

    if (!uploadResult.success) {
      const err = new Error(
        uploadResult.message
          ? `Gagal mengunggah sertifikat ke server FTP: ${uploadResult.message}`
          : 'Gagal mengunggah sertifikat ke server FTP'
      );

      err.statusCode = 502;

      // DB tidak diubah supaya status tidak terlanjur jadi UPLOADED
      // padahal file-nya tidak ada di FTP.
      res.status(502).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const filePath = buildFtpStoredPath(filename);

    // Bersihkan riwayat approval lama (mis. sisa REJECT sebelum upload ulang)
    // supaya alur approval mulai lagi dari approver_no = 1 dan record muncul
    // kembali di daftar pending approval.
    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Eksternal_Status WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.DELETE }
    );

    await sequelizeMSQL.query(
      `UPDATE T_Kalibrasi_Eksternal
       SET sertifikat_vendor_filename = :filename,
           sertifikat_vendor_path = :filePath,
           status = 'UPLOADED',
           updated_by = :updated_by,
           updated_date = SYSDATETIME()
       WHERE ekst_id = :ekst_id`,
      {
        replacements: { ekst_id, filename, filePath, updated_by: user_id },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Sertifikat berhasil diunggah ke server FTP',
      data: {
        filename,
        filePath,
        originalFilename: req.file.originalname,
        extension: ext,
      },
    });
  } catch (error) {
    // Jangan tinggalkan file sampah di staging kalau terjadi error tak terduga.
    if (req.file) {
      await removeUploadedFile(path.resolve(req.body?.path || req.file.path));
    }

    console.error('Error in uploadSertifikatVendor:', error);
    next(error);
  }
};

/**
 * DELETE /delete-sertifikat
 * Menghapus file sertifikat vendor yang sudah terunggah selama record BELUM di-approve.
 * Berguna kalau user salah upload file.
 * Status record dikembalikan ke DRAFT sehingga user bisa upload ulang.
 * Query params: ekst_id (required)
 */
const deleteSertifikatVendor = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const ekst_id = req.query.ekst_id || req.body?.ekst_id;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const record = await sequelizeMSQL.query(
      `SELECT status, sertifikat_vendor_filename, sertifikat_vendor_path
       FROM T_Kalibrasi_Eksternal
       WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (!record.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const { status, sertifikat_vendor_filename, sertifikat_vendor_path } = record[0];

    if (LOCKED_STATUSES.includes(status)) {
      const err = new Error('Sertifikat yang sudah disetujui tidak dapat dihapus');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (!sertifikat_vendor_filename && !sertifikat_vendor_path) {
      const err = new Error('Belum ada sertifikat yang diunggah');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Bersihkan referensi di DB dulu, lalu hapus file fisik (best effort)
    await sequelizeMSQL.query(
      `UPDATE T_Kalibrasi_Eksternal
       SET sertifikat_vendor_filename = NULL,
           sertifikat_vendor_path = NULL,
           status = 'DRAFT',
           updated_by = :updated_by,
           updated_date = SYSDATETIME()
       WHERE ekst_id = :ekst_id`,
      {
        replacements: { ekst_id, updated_by: user_id },
        type: Sequelize.QueryTypes.UPDATE,
      }
    );

    // File FTP dihapus di server FTP, record lama dihapus dari disk lokal.
    let fileRemoved = false;

    if (isFtpStoredPath(sertifikat_vendor_path)) {
      const ftpDeleteResult = await deleteFileFromFTP(sertifikat_vendor_filename);

      fileRemoved = ftpDeleteResult.success;

      if (!ftpDeleteResult.success) {
        // Referensi DB sudah dibersihkan, jadi user tetap bisa upload ulang.
        // Sisa file di FTP akan tertimpa saat upload berikutnya (nama deterministik).
        console.warn('FTP delete warning:', ftpDeleteResult.message);
      }
    } else {
      fileRemoved = await removeUploadedFile(sertifikat_vendor_path);
    }

    return res.status(200).json({
      success: true,
      message: 'Sertifikat berhasil dihapus. Silakan unggah ulang file yang benar.',
      data: { filename: sertifikat_vendor_filename, fileRemoved },
    });
  } catch (error) {
    console.error('Error in deleteSertifikatVendor:', error);
    next(error);
  }
};

/**
 * GET /current-approve
 * Returns the current (maximum) approver_no for an eksternal record.
 * Query params: ekst_id (required)
 */
const getCurrentApprove = async (req, res, next) => {
  try {
    const { ekst_id } = req.query;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const query = `
      SELECT ISNULL(MAX(approver_no), 0) AS apprmax
      FROM T_Kalibrasi_Eksternal_Status
      WHERE ekst_id = :ekst_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { ekst_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: { apprmax: results[0]?.apprmax || 0 },
    });
  } catch (error) {
    console.error('Error in getCurrentApprove:', error);
    next(error);
  }
};

/**
 * GET /check-approve-button
 * Checks whether the current user can approve the record.
 * Logic mirrors penghapusan-alat pattern:
 *   Level 1 (Validation MGR): Appr_DeptID = user's bagian_user, Appr_No = 1
 * Query params: ekst_id (required)
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const { ekst_id } = req.query;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Current approval level
    const apprMaxResult = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(approver_no), 0) AS apprmax FROM T_Kalibrasi_Eksternal_Status WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );
    const apprmax = apprMaxResult[0]?.apprmax || 0;
    const appr_no = apprmax + 1;

    // Only one approval level (Validation MGR = 1)
    if (appr_no > 1) {
      return res.status(200).json({
        success: true,
        data: { can_approve: false, appr_no, message: 'Semua approval sudah selesai' },
      });
    }

    // Check m_approver_lines for level 1
    const checkQuery = `
      SELECT COUNT(*) AS cnt
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :appCode
        AND Appr_DeptID = :bagian_user
        AND Appr_ID = :user_id
        AND Appr_No = :appr_no
    `;

    const checkResult = await sequelizeMSQL.query(checkQuery, {
      replacements: { appCode: APP_CODE, bagian_user, user_id, appr_no },
      type: Sequelize.QueryTypes.SELECT,
    });

    const can_approve = (checkResult[0]?.cnt || 0) > 0;

    return res.status(200).json({
      success: true,
      data: { can_approve, appr_no },
    });
  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * GET /approver-identity
 * Returns Appr_Identity for the given approver.
 * Query params: appr_id, appr_no
 */
const getApproverIdentityEksternal = async (req, res, next) => {
  try {
    const { appr_id, appr_no } = req.query;
    const identity = await getApproverIdentity(appr_id, appr_no, APP_CODE);
    return res.status(200).json({ success: true, data: { identity } });
  } catch (error) {
    console.error('Error in getApproverIdentityEksternal:', error);
    next(error);
  }
};

/**
 * POST /approve
 * Approve or reject an eksternal record.
 * Body: ekst_id (required), action ('approve'|'reject'), catatan (optional)
 */
const approveKalibrasiEksternal = async (req, res, next) => {
  try {
    const { user_id, bagian_user, nama_user } = req.user;
    const { ekst_id, action, catatan } = req.body;

    if (!ekst_id || !action) {
      const err = new Error('ekst_id dan action wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (!['approve', 'reject'].includes(action)) {
      const err = new Error('action harus "approve" atau "reject"');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard (additional to existing approver auth check)
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Verify record status allows approval
    const ekstRecord = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (!ekstRecord.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (ekstRecord[0]?.status !== 'UPLOADED') {
      const err = new Error('Hanya data berstatus UPLOADED yang dapat disetujui/ditolak');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Current approval level
    const apprMaxResult = await sequelizeMSQL.query(
      `SELECT ISNULL(MAX(approver_no), 0) AS apprmax FROM T_Kalibrasi_Eksternal_Status WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );
    const apprmax = apprMaxResult[0]?.apprmax || 0;
    const appr_no = apprmax + 1;

    if (appr_no > 1) {
      const err = new Error('Approval sudah selesai');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Validate user is authorized
    const authCheck = await sequelizeMSQL.query(
      `SELECT COUNT(*) AS cnt FROM m_approver_lines
       WHERE isactive = 1
         AND Appr_ApplicationCode LIKE :appCode
         AND Appr_DeptID = :bagian_user
         AND Appr_ID = :user_id
         AND Appr_No = :appr_no`,
      { replacements: { appCode: APP_CODE, bagian_user, user_id, appr_no }, type: Sequelize.QueryTypes.SELECT }
    );

    if ((authCheck[0]?.cnt || 0) === 0) {
      const err = new Error('Anda tidak memiliki hak approval untuk record ini');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const approveStatus = action === 'approve' ? 'APPROVE' : 'REJECT';

    // Insert into status table
    await sequelizeMSQL.query(
      `INSERT INTO T_Kalibrasi_Eksternal_Status
         (ekst_id, approver_no, USER_ID, nama_approver, status, catatan, process_date, created_by, created_date)
       VALUES
         (:ekst_id, :appr_no, :user_id, :nama_user, :approveStatus, :catatan, SYSDATETIME(), :user_id, SYSDATETIME())`,
      {
        replacements: {
          ekst_id,
          appr_no,
          user_id,
          nama_user,
          approveStatus,
          catatan: catatan || null,
        },
        type: Sequelize.QueryTypes.INSERT,
      }
    );

    // Update main record status
    await sequelizeMSQL.query(
      `UPDATE T_Kalibrasi_Eksternal
       SET status = :newStatus, updated_by = :user_id, updated_date = SYSDATETIME()
       WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id, newStatus, user_id }, type: Sequelize.QueryTypes.UPDATE }
    );

    const message = action === 'approve'
      ? 'Sertifikat kalibrasi eksternal telah disetujui'
      : 'Sertifikat kalibrasi eksternal ditolak';

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Error in approveKalibrasiEksternal:', error);
    next(error);
  }
};

/**
 * GET /download-sertifikat
 * Serves the uploaded vendor certificate file.
 * File diambil dari FTP (folder eKalibrasi) ke tmp lalu di-stream ke browser.
 * Record lama yang masih menyimpan path lokal absolut tetap dilayani dari disk.
 * Query params: ekst_id (required)
 */
const downloadSertifikatVendor = async (req, res, next) => {
  try {
    const { bagian_user } = req.user;
    const { ekst_id } = req.query;

    if (!ekst_id) {
      const err = new Error('ekst_id is required');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const result = await sequelizeMSQL.query(
      `SELECT sertifikat_vendor_filename, sertifikat_vendor_path
       FROM T_Kalibrasi_Eksternal
       WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );

    if (!result.length || !result[0]?.sertifikat_vendor_path) {
      const err = new Error('File tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const storedPath = result[0].sertifikat_vendor_path;
    const fileName = result[0].sertifikat_vendor_filename || path.basename(storedPath);

    // Record lama: file masih ada di disk lokal server.
    if (!isFtpStoredPath(storedPath)) {
      if (!fs.existsSync(storedPath)) {
        const err = new Error('File tidak ditemukan di server');

        err.statusCode = 404;

        res.status(404).json({ success: false, message: err.message });

        next(err);

        return;
      }

      return res.download(storedPath, fileName);
    }

    // Record baru: ambil dari FTP ke tmp lalu kirim ke browser.
    await fs.promises.mkdir(TEMP_DOWNLOAD_DIR, { recursive: true });

    // Prefix unik supaya download paralel tidak saling menimpa file tmp.
    const localFilePath = path.join(
      TEMP_DOWNLOAD_DIR,
      `${Date.now()}_${process.pid}_${fileName}`
    );

    const downloadResult = await downloadFileFromFTP(fileName, localFilePath);

    if (!downloadResult.success) {
      await removeTempDownload(localFilePath);

      const err = new Error(
        downloadResult.message
          ? `Gagal mengunduh sertifikat dari server FTP: ${downloadResult.message}`
          : 'Gagal mengunduh sertifikat dari server FTP'
      );

      err.statusCode = 502;

      res.status(502).json({ success: false, message: err.message });

      next(err);

      return;
    }

    return res.download(localFilePath, fileName, async (sendErr) => {
      await removeTempDownload(localFilePath);

      if (sendErr) {
        console.error('Error sending sertifikat file:', sendErr);
      }
    });
  } catch (error) {
    console.error('Error in downloadSertifikatVendor:', error);
    next(error);
  }
};

/**
 * POST /save-tidak-dapat
 * Create or update a "unit tidak siap dikalibrasi" record.
 * New record: creates T_Kalibrasi_Eksternal with is_tidak_dapat=1, status=TIDAK_DAPAT.
 * Update: allowed when status=TIDAK_DAPAT (termasuk setelah ditolak MGR) atau legacy
 *         TIDAK_DAPAT_REJECTED. Jejak penolakan dibuang supaya masuk antrian MGR lagi.
 * Body: schedule_detail_id, ekst_id (null = create), alasan_tidak_dapat, kondisi_alat
 */
const saveTidakDapat = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const { schedule_detail_id, ekst_id, alasan_tidak_dapat, kondisi_alat } = req.body;

    if (!schedule_detail_id) {
      const err = new Error('schedule_detail_id wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (!alasan_tidak_dapat?.trim()) {
      const err = new Error('Alasan tidak dapat dikalibrasi wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard: create uses schedule_detail_id, update uses ekst_id
    const ownerDept = await getOwningDepartment(!ekst_id ? schedule_detail_id : ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    if (!ekst_id) {
      const checkResult = await sequelizeMSQL.query(
        `SELECT COUNT(*) AS cnt FROM T_Kalibrasi_Eksternal WHERE schedule_detail_id = :schedule_detail_id`,
        { replacements: { schedule_detail_id }, type: Sequelize.QueryTypes.SELECT }
      );
      if (checkResult[0]?.cnt > 0) {
        const err = new Error('Record kalibrasi eksternal untuk alat ini sudah ada');

        err.statusCode = 400;

        res.status(400).json({ success: false, message: err.message });

        next(err);

        return;
      }

      await sequelizeMSQL.query(
        `INSERT INTO T_Kalibrasi_Eksternal
           (schedule_detail_id, is_tidak_dapat, alasan_tidak_dapat, kondisi_alat, status, created_by, created_date)
         VALUES
           (:schedule_detail_id, 1, :alasan_tidak_dapat, :kondisi_alat, 'TIDAK_DAPAT', :created_by, SYSDATETIME())`,
        {
          replacements: {
            schedule_detail_id,
            alasan_tidak_dapat: alasan_tidak_dapat.trim(),
            kondisi_alat: kondisi_alat?.trim() || null,
            created_by: user_id,
          },
          type: Sequelize.QueryTypes.INSERT,
        }
      );
    } else {
      const statusCheck = await sequelizeMSQL.query(
        `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
        { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
      );
      if (!statusCheck.length) {
        const err = new Error('Data tidak ditemukan');

        err.statusCode = 404;

        res.status(404).json({ success: false, message: err.message });

        next(err);

        return;
      }
      if (!['TIDAK_DAPAT', 'TIDAK_DAPAT_REJECTED'].includes(statusCheck[0]?.status)) {
        const err = new Error('Hanya data berstatus TIDAK_DAPAT atau TIDAK_DAPAT_REJECTED yang dapat diubah');

        err.statusCode = 400;

        res.status(400).json({ success: false, message: err.message });

        next(err);

        return;
      }

      // Revisi setelah ditolak MGR: buang jejak penolakan supaya catatan lama
      // tidak ikut tampil dan record masuk lagi ke antrian approval MGR.
      await sequelizeMSQL.query(
        `DELETE FROM T_Kalibrasi_Eksternal_Status
         WHERE ekst_id = :ekst_id AND approver_no = 1 AND status = 'REJECT'`,
        { replacements: { ekst_id }, type: Sequelize.QueryTypes.DELETE }
      );

      await sequelizeMSQL.query(
        `UPDATE T_Kalibrasi_Eksternal
         SET alasan_tidak_dapat = :alasan_tidak_dapat,
             kondisi_alat       = :kondisi_alat,
             status             = 'TIDAK_DAPAT',
             updated_by         = :updated_by,
             updated_date       = SYSDATETIME()
         WHERE ekst_id = :ekst_id`,
        {
          replacements: {
            ekst_id,
            alasan_tidak_dapat: alasan_tidak_dapat.trim(),
            kondisi_alat: kondisi_alat?.trim() || null,
            updated_by: user_id,
          },
          type: Sequelize.QueryTypes.UPDATE,
        }
      );
    }

    return res.status(200).json({ success: true, message: 'Data tidak dapat dikalibrasi berhasil disimpan' });
  } catch (error) {
    console.error('Error in saveTidakDapat:', error);
    next(error);
  }
};

/**
 * POST /approve-tidak-dapat
 * Approve or reject a "tidak dapat dikalibrasi" record.
 * approve: INSERT T_Kalibrasi_Eksternal_Status (DELETE first to allow retry), status → TIDAK_DAPAT_APPROVED
 * reject : INSERT T_Kalibrasi_Eksternal_Status status='REJECT' + catatan, status main record
 *          dikembalikan ke step sebelumnya (TIDAK_DAPAT) — pola sama dengan "lampiran dihapus".
 *          Baris REJECT dihapus lagi ketika FA merevisi via saveTidakDapat.
 * Body: ekst_id, action ('approve'|'reject'), catatan
 */
const approveTidakDapat = async (req, res, next) => {
  try {
    const { user_id, bagian_user, nama_user } = req.user;
    const { ekst_id, action, catatan } = req.body;

    if (!ekst_id || !action) {
      const err = new Error('ekst_id dan action wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (!['approve', 'reject'].includes(action)) {
      const err = new Error('action harus "approve" atau "reject"');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard (additional to existing approver auth check)
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const ekstRecord = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );
    if (!ekstRecord.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }
    if (ekstRecord[0]?.status !== 'TIDAK_DAPAT') {
      const err = new Error('Hanya data berstatus TIDAK_DAPAT yang dapat disetujui/ditolak');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const appr_no = 1;
    const authCheck = await sequelizeMSQL.query(
      `SELECT COUNT(*) AS cnt FROM m_approver_lines
       WHERE isactive = 1
         AND Appr_ApplicationCode LIKE :appCode
         AND Appr_DeptID = :bagian_user
         AND Appr_ID = :user_id
         AND Appr_No = :appr_no`,
      { replacements: { appCode: APP_CODE, bagian_user, user_id, appr_no }, type: Sequelize.QueryTypes.SELECT }
    );
    if ((authCheck[0]?.cnt || 0) === 0) {
      const err = new Error('Anda tidak memiliki hak approval untuk record ini');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Sudah pernah ditolak → tunggu FA merevisi dulu (saveTidakDapat yang
    // membuang jejak penolakannya), jangan bisa di-approve/tolak ulang.
    const existingStatus = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal_Status WHERE ekst_id = :ekst_id AND approver_no = :appr_no`,
      { replacements: { ekst_id, appr_no }, type: Sequelize.QueryTypes.SELECT }
    );
    if (existingStatus[0]?.status === 'REJECT') {
      const err = new Error('Data sudah ditolak — menunggu revisi dari FA');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Always delete existing status record first (idempotent, handles retry)
    await sequelizeMSQL.query(
      `DELETE FROM T_Kalibrasi_Eksternal_Status WHERE ekst_id = :ekst_id AND approver_no = :appr_no`,
      { replacements: { ekst_id, appr_no }, type: Sequelize.QueryTypes.DELETE }
    );

    const isApprove = action === 'approve';
    const approveStatus = isApprove ? 'APPROVE' : 'REJECT';
    // Reject mengikuti pola "lampiran dihapus": status record dikembalikan ke
    // step sebelumnya (TIDAK_DAPAT) supaya FA langsung bisa merevisi, bukan
    // berhenti di status penolakan. Jejak penolakan + catatan MGR disimpan di
    // T_Kalibrasi_Eksternal_Status (status='REJECT') dan baru dibuang saat FA
    // menyimpan revisinya lewat saveTidakDapat.
    const newStatus = isApprove ? 'TIDAK_DAPAT_APPROVED' : 'TIDAK_DAPAT';
    await sequelizeMSQL.query(
      `INSERT INTO T_Kalibrasi_Eksternal_Status
         (ekst_id, approver_no, USER_ID, nama_approver, status, catatan, process_date, created_by, created_date)
       VALUES
         (:ekst_id, :appr_no, :user_id, :nama_user, :approveStatus, :catatan, SYSDATETIME(), :user_id, SYSDATETIME())`,
      {
        replacements: { ekst_id, appr_no, user_id, nama_user, approveStatus, catatan: catatan?.trim() || null },
        type: Sequelize.QueryTypes.INSERT,
      }
    );

    await sequelizeMSQL.query(
      `UPDATE T_Kalibrasi_Eksternal
       SET status = :newStatus, updated_by = :user_id, updated_date = SYSDATETIME()
       WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id, newStatus, user_id }, type: Sequelize.QueryTypes.UPDATE }
    );

    return res.status(200).json({
      success: true,
      message: isApprove
        ? 'Data tidak dapat dikalibrasi telah disetujui oleh Validation MGR'
        : 'Data ditolak dan dikembalikan ke FA untuk revisi',
    });
  } catch (error) {
    console.error('Error in approveTidakDapat:', error);
    next(error);
  }
};

/**
 * POST /konfirmasi-label
 * Confirm that the calibration label has been physically affixed to the instrument.
 * Valid for both normal path (APPROVED) and tidak-dapat path (TIDAK_DAPAT_APPROVED).
 * Sets status = LABEL_TEMPEL, records timestamp and user.
 * Body: ekst_id
 */
const konfirmasiLabel = async (req, res, next) => {
  try {
    const { user_id, bagian_user } = req.user;
    const { ekst_id } = req.body;

    if (!ekst_id) {
      const err = new Error('ekst_id wajib diisi');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    // Ownership guard
    const ownerDept = await getOwningDepartment(ekst_id, bagian_user);
    if (ownerDept && ownerDept !== bagian_user) {
      const err = new Error('Anda tidak memiliki akses ke data departemen lain');

      err.statusCode = 403;

      res.status(403).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const statusCheck = await sequelizeMSQL.query(
      `SELECT status FROM T_Kalibrasi_Eksternal WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id }, type: Sequelize.QueryTypes.SELECT }
    );
    if (!statusCheck.length) {
      const err = new Error('Data tidak ditemukan');

      err.statusCode = 404;

      res.status(404).json({ success: false, message: err.message });

      next(err);

      return;
    }

    const currentStatus = statusCheck[0]?.status;
    if (!['APPROVED', 'TIDAK_DAPAT_APPROVED'].includes(currentStatus)) {
      const err = new Error('Konfirmasi label hanya bisa dilakukan setelah sertifikat disetujui (APPROVED atau TIDAK_DAPAT_APPROVED)');

      err.statusCode = 400;

      res.status(400).json({ success: false, message: err.message });

      next(err);

      return;
    }

    await sequelizeMSQL.query(
      `UPDATE T_Kalibrasi_Eksternal
       SET status           = 'LABEL_TEMPEL',
           tgl_label_tempel = SYSDATETIME(),
           label_tempel_by  = :user_id,
           updated_by       = :user_id,
           updated_date     = SYSDATETIME()
       WHERE ekst_id = :ekst_id`,
      { replacements: { ekst_id, user_id }, type: Sequelize.QueryTypes.UPDATE }
    );

    return res.status(200).json({ success: true, message: 'Konfirmasi label tertempel berhasil dicatat' });
  } catch (error) {
    console.error('Error in konfirmasiLabel:', error);
    next(error);
  }
};

module.exports = {
  getKalibrasiEksternalList,
  getKalibrasiEksternalDetail,
  saveKalibrasiEksternal,
  deleteKalibrasiEksternal,
  uploadSertifikatVendor,
  deleteSertifikatVendor,
  getCurrentApprove,
  checkApproveButton,
  getApproverIdentityEksternal,
  approveKalibrasiEksternal,
  downloadSertifikatVendor,
  saveTidakDapat,
  approveTidakDapat,
  konfirmasiLabel,
  PROGRAM_NAME,
};
