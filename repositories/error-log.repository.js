'use strict';

/**
 * Error-log repository.
 *
 * Writes mutation (POST/PUT/DELETE) errors into [dbo].[logging_mike].
 * This is intentionally fire-and-forget from the caller's perspective:
 * the repository never throws; it only console.errors internal failures.
 */

const sql = require('mssql');
const { createRequest } = require('./calibration-workbook.repository');

async function insertErrorLog(payload) {
  try {
    const {
      method,
      url,
      headers,
      authToken,
      userId,
      delegatedTo,
      requestBody,
      errorMessage,
      errorStack,
      statusCode,
    } = payload;

    const request = await createRequest();

    request.input('Method', sql.NVarChar(10), method ?? null);
    request.input('Url', sql.NVarChar(sql.MAX), url ?? null);
    request.input('Headers', sql.NVarChar(sql.MAX), headers ? JSON.stringify(headers) : null);
    request.input('AuthToken', sql.NVarChar(sql.MAX), authToken ?? null);
    request.input('UserId', sql.NVarChar(255), userId ?? null);
    request.input('DelegatedTo', sql.NVarChar(255), delegatedTo ?? null);
    request.input('RequestBody', sql.NVarChar(sql.MAX), requestBody ? JSON.stringify(requestBody) : null);
    request.input('ErrorMessage', sql.NVarChar(sql.MAX), errorMessage ?? null);
    request.input('ErrorStack', sql.NVarChar(sql.MAX), errorStack ?? null);
    request.input('StatusCode', sql.Int, statusCode ?? null);

    const query = `
      INSERT INTO [dbo].[logging_mike]
        ([method], [url], [headers], [auth_token], [userid], [delegatedto], [request_body],
         [error_message], [error_stack], [status_code], [createdAt], [updatedAt])
      VALUES
        (@Method, @Url, @Headers, @AuthToken, @UserId, @DelegatedTo, @RequestBody,
         @ErrorMessage, @ErrorStack, @StatusCode, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
    `;

    await request.query(query);
  } catch (error) {
    // Logging must never block the main request/response flow.
    console.error('[error-log.repository] Failed to insert error log:', error);
  }
}

module.exports = {
  insertErrorLog,
};
