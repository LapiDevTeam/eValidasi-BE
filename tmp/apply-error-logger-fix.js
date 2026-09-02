'use strict';

const fs = require('fs');
const path = require('path');

const controllersDir = path.resolve(__dirname, '../controllers/transactions');

function extractExportedNames(source) {
  const match = source.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((line) => {
      const nameMatch = line.match(/(?:^|\s)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?::|$)/);
      return nameMatch ? nameMatch[1].trim() : null;
    })
    .filter(Boolean);
}

function detectEol(source) {
  if (source.includes('\r\n')) return '\r\n';
  if (source.includes('\n')) return '\n';
  return '\n';
}

function replaceSendError(source, eol) {
  const lines = source.split(/\r?\n/);
  const startIdx = lines.findIndex((line) => /function sendError\(res, error\) \{/.test(line));
  if (startIdx === -1) return source;

  let braceDepth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < lines.length; i += 1) {
    for (const ch of lines[i]) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth -= 1;
    }
    if (braceDepth === 0) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return source;

  const indent = lines[startIdx].match(/^(\s*)/)[1];
  const newBody = [
    `${indent}function sendError(res, next, error) {`,
    `${indent}  let response;`,
    `${indent}  if (error.statusCode && error.validation) {`,
    `${indent}    response = res.status(error.statusCode).json({ success: false, message: error.message || 'Validation failed', errors: error.validation });`,
    `${indent}  } else if (error.statusCode) {`,
    `${indent}    response = res.status(error.statusCode).json({ success: false, message: error.message });`,
    `${indent}  } else {`,
    `${indent}    console.error('[error-logger-fix] unexpected error:', error);`,
    `${indent}    response = res.status(500).json({ success: false, message: 'Internal server error' });`,
    `${indent}  }`,
    `${indent}`,
    `${indent}  // Propagate to global error middleware so the mutation error logger can record it.`,
    `${indent}  next(error);`,
    `${indent}  return response;`,
    `${indent}}`,
  ];

  const newLines = [...lines.slice(0, startIdx), ...newBody, ...lines.slice(endIdx + 1)];
  return newLines.join(eol);
}

function fixController(filePath) {
  const originalSource = fs.readFileSync(filePath, 'utf8');
  const eol = detectEol(originalSource);
  let source = originalSource;

  source = replaceSendError(source, eol);

  // If sendError was not found, skip.
  if (source === originalSource) {
    console.log(`Skipped: ${path.basename(filePath)} (no sendError found)`);
    return;
  }

  // Update sendError calls.
  source = source.replace(/sendError\(res, error\)/g, 'sendError(res, next, error)');

  // Update route handler signatures.
  const exportedNames = extractExportedNames(source);
  for (const name of exportedNames) {
    const regex = new RegExp(`(async function ${name}\\()req, res(\\) \\{)`, 'g');
    source = source.replace(regex, '$1req, res, next$2');
  }

  fs.writeFileSync(filePath, source);
  console.log(`Fixed: ${path.basename(filePath)} (${exportedNames.length} handlers)`);
}

const files = [
  'kalibrasi-eksternal.controller.js',
  'master-jadwal-bulanan.controller.js',
  'timer-calibration.controller.js',
  'timbangan-calibration.controller.js',
  'temperature-calibration.controller.js',
  'tapped-volumeter-calibration.controller.js',
  'rpm-calibration.controller.js',
  'disintegration-calibration.controller.js',
  'tidak-dapat-internal.controller.js',
  'sertifikasi-Kalibrasi-Bagian-DA.controller.js',
  'master-vendor.controller.js',
  'calibration-risk-assessment.controller.js',
  'sertifikasi-Timbangan.controller.js',
  'sertifikasi-Kalibrasi-Bagian.controller.js',
];

for (const file of files) {
  fixController(path.join(controllersDir, file));
}

console.log('Done.');
