'use strict';

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../controllers/transactions/calibration-workbook.controller.js');
let source = fs.readFileSync(filePath, 'utf8');

// 1. Update sendError signature and make it propagate to Express error middleware.
source = source.replace(
  /function sendError\(res, error\) \{/,
  `function sendError(res, next, error) {`
);

source = source.replace(
  /function sendError\(res, next, error\) \{[\s\S]*?return res\.status\(500\)\.json\(\{\n\s*success: false,\n\s*message: 'Internal server error',\n\s*\}\);\n\}/,
  `function sendError(res, next, error) {
  // Always log full error details for debugging.
  console.error('[calibration-workbook ERROR]', error);
  if (error.stack) {
    console.error('[calibration-workbook STACK]', error.stack);
  }

  let response;
  if (error.statusCode && error.validation) {
    response = res.status(error.statusCode).json({
      success: false,
      message: 'Validation failed',
      errors: error.validation,
    });
  } else if (error.statusCode) {
    response = res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  } else {
    response = res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }

  // Propagate to global error middleware so the mutation error logger can record it.
  next(error);
  return response;
}`
);

// 2. Update all sendError calls to pass next.
source = source.replace(/sendError\(res, error\)/g, 'sendError(res, next, error)');

// 3. Update route handler signatures to include next.
const routeHandlers = [
  'listCalibrationSessions',
  'getCalibrationSession',
  'createCalibrationSession',
  'updateCalibrationSession',
  'deleteCalibrationSession',
  'finalizeCalibrationSession',
  'approveSession',
  'rejectSession',
  'publishSertifikatBagian',
  'updateEvaluationResult',
  'listNominalPoints',
  'createNominalPoint',
  'updateNominalPoint',
  'deleteNominalPoint',
  'listReadings',
  'createReading',
  'updateReading',
  'deleteReading',
  'bulkUpsertReadings',
  'listRegressionInputs',
  'createRegressionInput',
  'updateRegressionInput',
  'deleteRegressionInput',
  'getLevelCorrection',
  'updateLevelCorrection',
  'getUncertaintyInputs',
  'updateUncertaintyInputs',
  'calculateSession',
  'getResults',
  'getSummary',
  'listPressureConversions',
  'createPressureConversion',
  'updatePressureConversion',
  'deletePressureConversion',
];

for (const name of routeHandlers) {
  const regex = new RegExp(`async function ${name}\\(req, res\\) \\{`, 'g');
  source = source.replace(regex, `async function ${name}(req, res, next) {`);
}

fs.writeFileSync(filePath, source);
console.log('Updated', filePath);
