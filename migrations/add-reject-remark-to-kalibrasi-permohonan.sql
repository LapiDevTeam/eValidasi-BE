-- Migration: add reject_remark column to T_Kalibrasi_Permohonan
-- Safe to run multiple times.

IF COL_LENGTH('dbo.T_Kalibrasi_Permohonan', 'reject_remark') IS NULL
BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Permohonan
    ADD reject_remark NVARCHAR(500) NULL;
END;
