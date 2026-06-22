-- Migration: Add Justifikasi (note) columns to RA_CalibrationAssessment
-- Purpose: Store per-parameter justification text for Risk Scoring section C
--          (Severity, Probability, Detectability) as required by the form.
-- NOTE: Idempotent — safe to re-run.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'SeverityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD SeverityNote NVARCHAR(MAX) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'ProbabilityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD ProbabilityNote NVARCHAR(MAX) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'DetectabilityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD DetectabilityNote NVARCHAR(MAX) NULL;

PRINT 'Migration complete: SeverityNote, ProbabilityNote, DetectabilityNote verified/added to RA_CalibrationAssessment';
