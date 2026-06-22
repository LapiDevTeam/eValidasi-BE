-- Migration: Link RA_CalibrationAssessment to T_Kalibrasi_Permohonan
-- Purpose: Store the permohonan number on the risk assessment and enforce the relationship.
-- Safe to re-run.

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment'
    AND COLUMN_NAME = 'No_Permohonan'
)
BEGIN
  ALTER TABLE RA_CalibrationAssessment ADD No_Permohonan NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_RA_CalibrationAssessment_T_Kalibrasi_Permohonan'
)
BEGIN
  ALTER TABLE RA_CalibrationAssessment WITH CHECK
  ADD CONSTRAINT FK_RA_CalibrationAssessment_T_Kalibrasi_Permohonan
  FOREIGN KEY (No_Permohonan)
  REFERENCES T_Kalibrasi_Permohonan (No_Permohonan);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_RA_CalibrationAssessment_No_Permohonan'
    AND object_id = OBJECT_ID('RA_CalibrationAssessment')
)
BEGIN
  CREATE INDEX IX_RA_CalibrationAssessment_No_Permohonan
  ON RA_CalibrationAssessment (No_Permohonan);
END
GO

PRINT 'Migration complete: RA_CalibrationAssessment.No_Permohonan FK verified/added.';
