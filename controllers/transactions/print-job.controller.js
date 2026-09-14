'use strict';

/**
 * Endpoint cetak terkontrol lewat printForm (pilot: Sertifikat Bagian).
 *
 * Catatan autentikasi — dua endpoint di berkas ini sengaja TIDAK memakai
 * middleware `authentication`:
 *
 *   GET  /print-job/:jobId/download
 *   POST /print-job/:jobId/result
 *
 * Keduanya dipanggil oleh printForm.exe, bukan oleh browser. printForm tidak
 * punya sesi LMS dan tidak bisa mendapatkannya. Penggantinya adalah token acak
 * 32 byte per job yang hanya diketahui pemegang job itu, hanya berlaku selama
 * job hidup (20 menit), dan disimpan di database dalam bentuk hash — bukan
 * kelonggaran, melainkan mekanisme lain untuk masalah yang sama.
 */

const printJobService = require('../../services/printJob.service');

/** POST /transactions/kalibrasi/print-job */
const createPrintJob = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat, print_route, document_name, copies } = req.body || {};

    const result = await printJobService.createPrintJob({
      qaId: qa_id,
      idNoSertifikat: id_no_sertifikat,
      printRoute: print_route,
      documentName: document_name,
      copies,
      user: req.user,
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'quota_exhausted') {
      return res.status(409).json({
        success: false,
        code: 'quota_exhausted',
        message: error.message,
      });
    }
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'bad_request',
        message: error.message,
      });
    }
    console.error('Error in createPrintJob:', error);
    return next(error);
  }
};

/** GET /transactions/kalibrasi/print-job/:jobId/download?token=... */
const downloadJobFile = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { filePath } = await printJobService.getJobFileForDownload(jobId, req.query.token);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'error',
        message: error.message,
      });
    }
    console.error('Error in downloadJobFile:', error);
    return next(error);
  }
};

/** POST /transactions/kalibrasi/print-job/:jobId/result */
const recordJobResult = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

    const outcome = await printJobService.recordJobResult(jobId, bearer, req.body || {});
    return res.status(200).json({ success: true, data: outcome });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || 'error',
        message: error.message,
      });
    }
    console.error('Error in recordJobResult:', error);
    return next(error);
  }
};

/** GET /transactions/kalibrasi/print-job/quota?qa_id=&id_no_sertifikat= */
const getQuota = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat } = req.query;
    const state = await printJobService.getQuotaState({
      qaId: qa_id,
      idNoSertifikat: id_no_sertifikat,
      userId: req.user?.user_id,
    });
    return res.status(200).json({ success: true, data: state });
  } catch (error) {
    console.error('Error in getQuota:', error);
    return next(error);
  }
};

/** GET /transactions/kalibrasi/print-job/events?qa_id=&id_no_sertifikat=&limit= */
const listPrintEvents = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat, limit } = req.query;
    const events = await printJobService.listEvents({
      qaId: qa_id,
      idNoSertifikat: id_no_sertifikat,
      limit,
    });
    return res.status(200).json({ success: true, data: events });
  } catch (error) {
    console.error('Error in listPrintEvents:', error);
    return next(error);
  }
};

module.exports = {
  createPrintJob,
  downloadJobFile,
  recordJobResult,
  getQuota,
  listPrintEvents,
};
