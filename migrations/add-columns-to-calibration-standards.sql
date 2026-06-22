-- =============================================================================
-- add-columns-to-calibration-standards.sql
--
-- Adds new columns to support the full MASTER STANDARD data model:
--   calibration_standards    → no_id, recalibration_date_text, brand_type,
--                               serial_number, is_active, updated_at
--                             + widens certificate_no to VARCHAR(255)
--   calibration_standard_points → point_order
--
-- Safe to run multiple times (column existence checks guard every ALTER).
-- Compatible with SQL Server 2008+.
-- =============================================================================

-- 1. calibration_standards – new metadata columns
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'no_id'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [no_id] VARCHAR(255) NULL;
    PRINT 'Column no_id added to calibration_standards.';
END
ELSE
    PRINT 'Column no_id already exists – skipped.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'recalibration_date_text'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [recalibration_date_text] VARCHAR(100) NULL;
    PRINT 'Column recalibration_date_text added to calibration_standards.';
END
ELSE
    PRINT 'Column recalibration_date_text already exists – skipped.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'brand_type'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [brand_type] VARCHAR(255) NULL;
    PRINT 'Column brand_type added to calibration_standards.';
END
ELSE
    PRINT 'Column brand_type already exists – skipped.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'serial_number'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [serial_number] VARCHAR(255) NULL;
    PRINT 'Column serial_number added to calibration_standards.';
END
ELSE
    PRINT 'Column serial_number already exists – skipped.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'is_active'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [is_active] BIT NOT NULL DEFAULT 1;
    PRINT 'Column is_active added to calibration_standards.';
END
ELSE
    PRINT 'Column is_active already exists – skipped.';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND name = N'updated_at'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ADD [updated_at] DATETIME NULL;
    PRINT 'Column updated_at added to calibration_standards.';
END
ELSE
    PRINT 'Column updated_at already exists – skipped.';
GO

-- Widen certificate_no from VARCHAR(100) to VARCHAR(255)
DECLARE @certNoType NVARCHAR(50);
SELECT @certNoType = t.name + '(' + CAST(c.max_length AS VARCHAR) + ')'
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
  AND c.name = N'certificate_no';

IF @certNoType = 'varchar(100)'
BEGIN
    ALTER TABLE [dbo].[calibration_standards]
        ALTER COLUMN [certificate_no] VARCHAR(255) NULL;
    PRINT 'Column certificate_no widened to VARCHAR(255).';
END
ELSE
    PRINT 'Column certificate_no width is already ' + ISNULL(@certNoType, 'unknown') + ' – skipped.';
GO

-- =============================================================================
-- 2. calibration_standard_points – point_order column
-- =============================================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standard_points]')
      AND name = N'point_order'
)
BEGIN
    ALTER TABLE [dbo].[calibration_standard_points]
        ADD [point_order] INT NULL;
    PRINT 'Column point_order added to calibration_standard_points.';
END
ELSE
    PRINT 'Column point_order already exists – skipped.';
GO

-- =============================================================================
-- 3. calibration_standard_points – make uncertainty nullable
--    (spec: uncertainty DECIMAL(18,10) NULL)
-- =============================================================================
DECLARE @uncertaintyNullable BIT = 0;
SELECT @uncertaintyNullable = CASE WHEN c.is_nullable = 1 THEN 1 ELSE 0 END
FROM sys.columns c
WHERE c.object_id = OBJECT_ID(N'[dbo].[calibration_standard_points]')
  AND c.name = N'uncertainty';

IF @uncertaintyNullable = 0
BEGIN
    ALTER TABLE [dbo].[calibration_standard_points]
        ALTER COLUMN [uncertainty] DECIMAL(18,10) NULL;
    PRINT 'Column uncertainty made nullable in calibration_standard_points.';
END
ELSE
    PRINT 'Column uncertainty is already nullable – skipped.';
GO

PRINT '=== Migration add-columns-to-calibration-standards complete. ===';
GO
