-- Drop workbook-only IDENTITAS ALAT fields from calibration_sessions (idempotent)
-- SQL Server 2008 compatible

IF OBJECT_ID(N'[dbo].[calibration_sessions]', N'U') IS NULL
BEGIN
    PRINT 'Table calibration_sessions not found. Nothing to drop.';
    RETURN;
END;
GO

IF COL_LENGTH('dbo.calibration_sessions', 'assm_merk') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
        DROP COLUMN [assm_merk];

    PRINT 'Column calibration_sessions.assm_merk dropped.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.assm_merk already absent.';
END;
GO

IF COL_LENGTH('dbo.calibration_sessions', 'serial_number') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[calibration_sessions]
        DROP COLUMN [serial_number];

    PRINT 'Column calibration_sessions.serial_number dropped.';
END
ELSE
BEGIN
    PRINT 'Column calibration_sessions.serial_number already absent.';
END;
GO
