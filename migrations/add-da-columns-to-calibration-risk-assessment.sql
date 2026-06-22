-- Migration: Add DA instrument identity columns to RA_CalibrationAssessment
-- Purpose: Allow RA_CalibrationAssessment records to carry the same identity fields
--          as the 4 existing DA tables (Thermohygro, Anak Timbangan, Timbangan, Bagian)
--          so they can participate in the searchInstrumen UNION query.
-- Executed: 2026-04-29 (inline via sqlcmd -Q)
-- NOTE: This script is idempotent — safe to re-run.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'QA_ID'
)
  ALTER TABLE RA_CalibrationAssessment ADD QA_ID NVARCHAR(50) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Assm_No_identitas_kalibrasi'
)
  ALTER TABLE RA_CalibrationAssessment ADD Assm_No_identitas_kalibrasi NVARCHAR(100) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Group_Da_Dept'
)
  ALTER TABLE RA_CalibrationAssessment ADD Group_Da_Dept NVARCHAR(50) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Assm_Kapasitas'
)
  ALTER TABLE RA_CalibrationAssessment ADD Assm_Kapasitas NVARCHAR(100) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Parameter_Kalibrasi'
)
  ALTER TABLE RA_CalibrationAssessment ADD Parameter_Kalibrasi NVARCHAR(100) NULL;

PRINT 'Migration complete: DA columns verified/added to RA_CalibrationAssessment';
