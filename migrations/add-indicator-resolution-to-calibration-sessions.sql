-- =============================================================================
-- Add indicator_type + resolution to calibration_sessions (idempotent)
-- Workbook mapping:
--   T12 = indicator type ('Analog' | 'Digital')
--   T11 = resolution value used in uncertainty component u4
-- =============================================================================

IF OBJECT_ID(N'[dbo].[calibration_sessions]', N'U') IS NULL
BEGIN
    PRINT 'Table calibration_sessions not found. Run create-pressure-calibration-tables.sql first.';
    RETURN;
END
GO

IF COL_LENGTH('dbo.calibration_sessions', 'indicator_type') IS NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
    ADD [indicator_type] VARCHAR(20) NOT NULL
        CONSTRAINT DF_calibration_sessions_indicator_type DEFAULT 'Digital' WITH VALUES;

    PRINT 'Column calibration_sessions.indicator_type added.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.indicator_type already exists.';
END
GO

IF COL_LENGTH('dbo.calibration_sessions', 'resolution') IS NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
    ADD [resolution] DECIMAL(18,8) NOT NULL
        CONSTRAINT DF_calibration_sessions_resolution DEFAULT 1 WITH VALUES;

    PRINT 'Column calibration_sessions.resolution added.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.resolution already exists.';
END
GO

-- Normalize existing values before adding the check constraint.
UPDATE [dbo].[calibration_sessions]
SET [indicator_type] = CASE
    WHEN UPPER(LTRIM(RTRIM([indicator_type]))) = 'ANALOG'  THEN 'Analog'
    WHEN UPPER(LTRIM(RTRIM([indicator_type]))) = 'DIGITAL' THEN 'Digital'
    ELSE 'Digital'
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_session_indicator_type'
      AND parent_object_id = OBJECT_ID(N'[dbo].[calibration_sessions]')
)
BEGIN
    ALTER TABLE [dbo].[calibration_sessions] WITH CHECK
    ADD CONSTRAINT CK_session_indicator_type
        CHECK ([indicator_type] IN ('Analog', 'Digital'));

    PRINT 'Constraint CK_session_indicator_type added.';
END
ELSE
BEGIN
    PRINT 'Constraint CK_session_indicator_type already exists.';
END
GO

PRINT '=== Migration add-indicator-resolution-to-calibration-sessions complete ===';
