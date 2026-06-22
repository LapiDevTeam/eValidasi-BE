-- =============================================================================
-- PRESSURE CALIBRATION MODULE – Table Migration
-- Compatible with SQL Server 2008+
-- Run this script once to create calibration-specific tables.
-- Do NOT recreate master instrument tables – those already exist.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. calibration_standards
--    Stores reference/standard equipment metadata.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standards]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_standards] (
        [standard_id]          INT            IDENTITY(1,1) PRIMARY KEY,
        [standard_code]        VARCHAR(50)    NULL,
        [standard_name]        VARCHAR(255)   NOT NULL,
        [certificate_no]       VARCHAR(100)   NULL,
        [traceability]         VARCHAR(255)   NULL,
        [recalibration_date]   DATE           NULL,
        [unit]                 VARCHAR(20)    NULL,
        [is_deleted]           BIT            NOT NULL DEFAULT 0,
        [created_at]           DATETIME       NOT NULL DEFAULT GETDATE()
    );
    PRINT 'Table calibration_standards created.';
END
ELSE
    PRINT 'Table calibration_standards already exists.';
GO

-- -----------------------------------------------------------------------------
-- 2. calibration_standard_points
--    Stores certificate correction data for each standard.
--    Used for linear-interpolation correction of raw standard readings.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_standard_points]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_standard_points] (
        [point_id]               INT              IDENTITY(1,1) PRIMARY KEY,
        [standard_id]            INT              NOT NULL,
        -- actual_pressure = true pressure value from NMI/certificate (Y axis)
        [actual_pressure]        DECIMAL(18,10)   NOT NULL,
        -- indicator_increasing = standard reading during upward sweep
        [indicator_increasing]   DECIMAL(18,10)   NOT NULL,
        -- indicator_decreasing = standard reading during downward sweep
        [indicator_decreasing]   DECIMAL(18,10)   NOT NULL,
        -- uncertainty from the standard's certificate (half-width, k=2 or as stated)
        [uncertainty]            DECIMAL(18,10)   NOT NULL DEFAULT 0,
        [unit]                   VARCHAR(20)      NULL,
        CONSTRAINT FK_std_points_standard
            FOREIGN KEY ([standard_id])
            REFERENCES [dbo].[calibration_standards]([standard_id])
    );
    PRINT 'Table calibration_standard_points created.';
END
ELSE
    PRINT 'Table calibration_standard_points already exists.';
GO

-- -----------------------------------------------------------------------------
-- 3. calibration_sessions
--    One session = one complete calibration job for one instrument.
--
--    NOTE: instrument_id references your existing master instrument table.
--    Foreign key is intentionally omitted because the exact master table
--    name/PK is not known at migration time.  Add it manually if needed:
--
--    ALTER TABLE calibration_sessions
--        ADD CONSTRAINT FK_session_instrument
--        FOREIGN KEY (instrument_id) REFERENCES <your_instrument_table>(<pk_column>);
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_sessions]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_sessions] (
        [session_id]       INT              IDENTITY(1,1) PRIMARY KEY,
        -- TODO: instrument_id references your existing master instrument table PK
        [instrument_id]    INT              NOT NULL,
        [standard_id]      INT              NOT NULL,
        [calibration_date] DATE             NOT NULL,
        [temperature]      DECIMAL(10,2)    NULL,
        [humidity]         DECIMAL(10,2)    NULL,
        [pic]              VARCHAR(100)     NULL,
        [uut_unit]         VARCHAR(20)      NULL,
        [standard_unit]    VARCHAR(20)      NULL,
        -- indicator_type: workbook T12 selector ('Analog' | 'Digital')
        [indicator_type]   VARCHAR(20)      NOT NULL DEFAULT 'Digital',
        -- resolution: workbook T11 value used in uncertainty component u4
        [resolution]       DECIMAL(18,8)    NOT NULL DEFAULT 1,
        -- W16 (TEKANAN NT): manual standard uncertainty component (u for "Standar")
        [standard_uncertainty]   DECIMAL(18,8)    NULL,
        -- W17 (TEKANAN NT): manual metal-rule uncertainty component (u for "Metal Rule")
        [metal_rule_uncertainty] DECIMAL(18,8)    NULL,
        -- delta_h: height difference between UUT and standard reference plane (metres)
        [delta_h]          DECIMAL(18,8)    NOT NULL DEFAULT 0,
        -- media_density: density of pressure medium (kg/m³); default 1.2 for air
        [media_density]    DECIMAL(18,8)    NOT NULL DEFAULT 1.2,
        -- gravity: local gravitational acceleration (m/s²); default 9.78
        [gravity]          DECIMAL(18,8)    NOT NULL DEFAULT 9.78,
        [status]           VARCHAR(30)      NOT NULL DEFAULT 'DRAFT',
        [is_deleted]       BIT              NOT NULL DEFAULT 0,
        [created_by]       VARCHAR(100)     NULL,
        [created_at]       DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_session_indicator_type
            CHECK ([indicator_type] IN ('Analog', 'Digital')),
        CONSTRAINT FK_session_standard
            FOREIGN KEY ([standard_id])
            REFERENCES [dbo].[calibration_standards]([standard_id])
    );
    PRINT 'Table calibration_sessions created.';
END
ELSE
    PRINT 'Table calibration_sessions already exists.';
GO

-- -----------------------------------------------------------------------------
-- 4. calibration_readings
--    Stores raw input readings per calibration session.
--
--    cycle_code examples: X1, X2, X3, X4, X5, X6
--    direction mapping:
--        X1, X3, X5 -> increasing
--        X2, X4, X6 -> decreasing
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_readings]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_readings] (
        [reading_id]          INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        -- point_index: 0-based index of the nominal calibration point
        [point_index]         INT              NOT NULL,
        [nominal_value]       DECIMAL(18,8)    NOT NULL,
        -- cycle_code: X1-X6
        [cycle_code]          VARCHAR(10)      NOT NULL,
        -- direction: 'increasing' or 'decreasing'
        [direction]           VARCHAR(20)      NOT NULL,
        [uut_reading]         DECIMAL(18,8)    NOT NULL,
        [standard_reading]    DECIMAL(18,8)    NOT NULL,
        -- corrected_standard: populated by the calculate endpoint
        [corrected_standard]  DECIMAL(18,10)   NULL,
        CONSTRAINT FK_readings_session
            FOREIGN KEY ([session_id])
            REFERENCES [dbo].[calibration_sessions]([session_id])
    );

    CREATE INDEX IX_readings_session_id
        ON [dbo].[calibration_readings]([session_id]);

    PRINT 'Table calibration_readings created.';
END
ELSE
    PRINT 'Table calibration_readings already exists.';
GO

-- -----------------------------------------------------------------------------
-- 5. calibration_results
--    Stores calculated final result per nominal calibration point.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_results]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_results] (
        [result_id]                  INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                 INT              NOT NULL,
        [point_index]                INT              NOT NULL,
        [nominal_value]              DECIMAL(18,8)    NULL,
        [uut_mean]                   DECIMAL(18,8)    NULL,
        [standard_mean]              DECIMAL(18,8)    NULL,
        [level_correction]           DECIMAL(18,10)   NULL,
        [error_value]                DECIMAL(18,10)   NULL,
        [repeatability]              DECIMAL(18,10)   NULL,
        [zero_deviation]             DECIMAL(18,10)   NULL,
        [combined_uncertainty]       DECIMAL(18,10)   NULL,
        [effective_degree_freedom]   DECIMAL(18,10)   NULL,
        [coverage_factor]            DECIMAL(18,10)   NULL,
        [expanded_uncertainty]       DECIMAL(18,10)   NULL,
        [lower_limit]                DECIMAL(18,10)   NULL,
        [upper_limit]                DECIMAL(18,10)   NULL,
        [created_at]                 DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_results_session
            FOREIGN KEY ([session_id])
            REFERENCES [dbo].[calibration_sessions]([session_id])
    );

    CREATE INDEX IX_results_session_id
        ON [dbo].[calibration_results]([session_id]);

    PRINT 'Table calibration_results created.';
END
ELSE
    PRINT 'Table calibration_results already exists.';
GO

PRINT '=== Pressure calibration migration complete ===';
