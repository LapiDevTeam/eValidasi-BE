'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROFILE_IEG,
  PROFILE_HASIL_TEMPLATE,
  resolveWorkbookProfile,
} = require('../src/services/workbookProfile.service');

test('resolveWorkbookProfile detects HASIL from session metadata', () => {
  const profile = resolveWorkbookProfile(
    {
      session_code: 'TEKANAN-NT-HASIL-PA',
      instrument_name: 'HASIL HITUNGAN (SATUAN PA)',
    },
    []
  );
  assert.equal(profile, PROFILE_HASIL_TEMPLATE);
});

test('resolveWorkbookProfile detects IEG when points include negative nominals', () => {
  const profile = resolveWorkbookProfile(
    {
      session_code: 'TEKANAN-NT-IEG-241',
      instrument_name: 'Differential Pressure Gauge IEG 241',
    },
    [
      { nominal_value: -60 },
      { nominal_value: -40 },
      { nominal_value: -20 },
      { nominal_value: 0 },
      { nominal_value: 20 },
    ]
  );
  assert.equal(profile, PROFILE_IEG);
});

test('resolveWorkbookProfile detects HASIL by nominal template shape', () => {
  const profile = resolveWorkbookProfile(
    {
      session_code: 'SESSION-A',
      instrument_name: 'Pressure Worksheet',
    },
    [
      { nominal_value: 0 },
      { nominal_value: 10 },
      { nominal_value: 20 },
      { nominal_value: 30 },
      { nominal_value: 40 },
      { nominal_value: 50 },
      { nominal_value: 60 },
    ]
  );
  assert.equal(profile, PROFILE_HASIL_TEMPLATE);
});

