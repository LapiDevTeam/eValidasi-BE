-- =============================================================================
-- Add manual uncertainty columns to calibration_sessions (idempotent)
-- Workbook mapping (TEKANAN NT.xls):
--   W16 = manual standard uncertainty (component u for "Standar")
--   W17 = manual metal rule uncertainty (component u for "Metal Rule")
-- =============================================================================

IF OBJECT_ID(N'[dbo].[calibration_sessions]', N'U') IS NULL
BEGIN
    PRINT 'Table calibration_sessions not found. Run create-pressure-calibration-tables.sql first.';
    RETURN;
END
GO

IF COL_LENGTH('dbo.calibration_sessions', 'standard_uncertainty') IS NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
    ADD [standard_uncertainty] DECIMAL(18,8) NULL;

    PRINT 'Column calibration_sessions.standard_uncertainty added.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.standard_uncertainty already exists.';
END
GO

IF COL_LENGTH('dbo.calibration_sessions', 'metal_rule_uncertainty') IS NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
    ADD [metal_rule_uncertainty] DECIMAL(18,8) NULL;

    PRINT 'Column calibration_sessions.metal_rule_uncertainty added.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.metal_rule_uncertainty already exists.';
END
GO

PRINT '=== Migration add-manual-uncertainties-to-calibration-sessions complete ===';
