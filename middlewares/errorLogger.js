'use strict';

/**
 * Mutation error logger middleware.
 *
 * Logs POST/PUT/DELETE requests that end in an error to [dbo].[logging_mike].
 * The DB insert is fire-and-forget: it never blocks or delays the response.
 *
 * Mount this after all routers and before the final global error handler.
 */

const { insertErrorLog } = require('../repositories/error-log.repository');

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE']);

function resolveStatusCode(err) {
  if (err && typeof err.code === 'number') return err.code;
  if (err && typeof err.statusCode === 'number') return err.statusCode;
  return 500;
}

function resolveAuthToken(req) {
  const raw = req.headers.authentication || req.headers.authorization;
  if (!raw) return null;
  if (typeof raw === 'string' && raw.startsWith('Bearer ')) {
    return raw.substring(7);
  }
  return raw;
}

function buildFullUrl(req) {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'unknown';
  return `${protocol}://${host}${req.originalUrl || req.url}`;
}

const errorLogger = (err, req, _res, next) => {
  try {
    if (!MUTATION_METHODS.has(req.method)) {
      return next(err);
    }

    const statusCode = resolveStatusCode(err);

    const payload = {
      method: req.method,
      url: buildFullUrl(req),
      headers: req.headers,
      authToken: resolveAuthToken(req),
      userId: req.user?.user_id || null,
      delegatedTo: req.user?.delegated_to || null,
      requestBody: req.body,
      errorMessage: err?.message || null,
      errorStack: err?.stack || null,
      statusCode,
    };

    // Fire-and-forget: never await, never block.
    insertErrorLog(payload).catch((logError) => {
      console.error('[errorLogger] Background insert failed:', logError);
    });
  } catch (logError) {
    // Even building the payload must not break error handling.
    console.error('[errorLogger] Failed to prepare log payload:', logError);
  }

  // Always pass the original error to the next error handler.
  next(err);
};

module.exports = errorLogger;
