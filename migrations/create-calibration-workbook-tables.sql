-- =============================================================================
-- Calibration Workbook (TEKANAN NT) Module
-- SQL Server 2008 compatible migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) calibration_sessions
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_sessions]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_sessions] (
        [session_id]          INT              IDENTITY(1,1) PRIMARY KEY,
        [session_code]        VARCHAR(50)      NULL,
        -- TODO: map instrument_id FK to your existing master instrument table if required
        [instrument_id]       INT              NULL,
        [instrument_code]     VARCHAR(100)     NULL,
        [instrument_name]     VARCHAR(255)     NULL,
        [calibration_date]    DATE             NULL,
        [unit_mode]           VARCHAR(20)      NOT NULL,
        [status]              VARCHAR(30)      NOT NULL DEFAULT 'DRAFT',
        [pic]                 VARCHAR(100)     NULL,
        [temperature]         DECIMAL(18,6)    NULL,
        [humidity]            DECIMAL(18,6)    NULL,
        [notes]               VARCHAR(1000)    NULL,
        [created_by]          VARCHAR(100)     NULL,
        [updated_by]          VARCHAR(100)     NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT CK_cal_session_unit_mode
            CHECK ([unit_mode] IN ('PA', 'BAR')),
        CONSTRAINT CK_cal_session_status
            CHECK ([status] IN ('DRAFT', 'CALCULATED', 'FINALIZED', 'CANCELLED'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_calibration_sessions_status'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_sessions]')
)
BEGIN
    CREATE INDEX [IX_calibration_sessions_status]
        ON [dbo].[calibration_sessions] ([status], [created_at]);
END
GO

-- -----------------------------------------------------------------------------
-- Compatibility patch for existing legacy calibration_sessions table
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[calibration_sessions]', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.calibration_sessions', 'session_code') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [session_code] VARCHAR(50) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'instrument_code') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [instrument_code] VARCHAR(100) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'instrument_name') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [instrument_name] VARCHAR(255) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'unit_mode') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [unit_mode] VARCHAR(20) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'notes') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [notes] VARCHAR(1000) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'updated_by') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [updated_by] VARCHAR(100) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'updated_at') IS NULL
        ALTER TABLE [dbo].[calibration_sessions] ADD [updated_at] DATETIME NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'unit_mode') IS NOT NULL
    BEGIN
        EXEC('
            UPDATE [dbo].[calibration_sessions]
            SET [unit_mode] = CASE
                WHEN UPPER(ISNULL([unit_mode], '''')) IN (''PA'', ''BAR'') THEN UPPER([unit_mode])
                WHEN UPPER(ISNULL([uut_unit], '''')) IN (''PA'', ''BAR'') THEN UPPER([uut_unit])
                ELSE ''PA''
            END
            WHERE [unit_mode] IS NULL
               OR UPPER([unit_mode]) NOT IN (''PA'', ''BAR'');
        ');
    END

    IF COLUMNPROPERTY(OBJECT_ID('dbo.calibration_sessions'), 'instrument_id', 'AllowsNull') = 0
        ALTER TABLE [dbo].[calibration_sessions] ALTER COLUMN [instrument_id] NVARCHAR(50) NULL;

    IF COL_LENGTH('dbo.calibration_sessions', 'standard_id') IS NOT NULL
       AND COLUMNPROPERTY(OBJECT_ID('dbo.calibration_sessions'), 'standard_id', 'AllowsNull') = 0
        ALTER TABLE [dbo].[calibration_sessions] ALTER COLUMN [standard_id] INT NULL;

    IF COLUMNPROPERTY(OBJECT_ID('dbo.calibration_sessions'), 'calibration_date', 'AllowsNull') = 0
        ALTER TABLE [dbo].[calibration_sessions] ALTER COLUMN [calibration_date] DATE NULL;
END
GO

-- -----------------------------------------------------------------------------
-- 2) calibration_nominal_points
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_nominal_points]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_nominal_points] (
        [point_id]            INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [point_order]         INT              NOT NULL,
        [nominal_value]       DECIMAL(18,10)   NOT NULL,
        [unit]                VARCHAR(20)      NOT NULL,
        [is_active]           BIT              NOT NULL DEFAULT 1,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT FK_cal_nominal_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_nominal_session_order'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_nominal_points]')
)
BEGIN
    CREATE INDEX [IX_cal_nominal_session_order]
        ON [dbo].[calibration_nominal_points] ([session_id], [point_order], [is_active]);
END
GO

-- -----------------------------------------------------------------------------
-- 3) calibration_readings
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
        [point_id]            INT              NOT NULL,
        [cycle_code]          VARCHAR(10)      NOT NULL,
        [direction]           VARCHAR(20)      NOT NULL,
        [uut_reading]         DECIMAL(18,10)   NULL,
        [standard_reading]    DECIMAL(18,10)   NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT CK_cal_reading_cycle
            CHECK ([cycle_code] IN ('X1', 'X2', 'X3', 'X4', 'X5', 'X6')),
        CONSTRAINT CK_cal_reading_direction
            CHECK ([direction] IN ('INCREASING', 'DECREASING')),
        CONSTRAINT FK_cal_reading_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id]),
        CONSTRAINT FK_cal_reading_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[calibration_nominal_points]([point_id])
    );
END
GO

-- -----------------------------------------------------------------------------
-- Compatibility patch for existing legacy calibration_readings table
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[calibration_readings]', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.calibration_readings', 'point_id') IS NULL
        ALTER TABLE [dbo].[calibration_readings] ADD [point_id] INT NULL;

    IF COL_LENGTH('dbo.calibration_readings', 'created_at') IS NULL
        ALTER TABLE [dbo].[calibration_readings] ADD [created_at] DATETIME NOT NULL DEFAULT GETDATE();

    IF COL_LENGTH('dbo.calibration_readings', 'updated_at') IS NULL
        ALTER TABLE [dbo].[calibration_readings] ADD [updated_at] DATETIME NULL;

    ALTER TABLE [dbo].[calibration_readings] ALTER COLUMN [uut_reading] DECIMAL(18,10) NULL;
    ALTER TABLE [dbo].[calibration_readings] ALTER COLUMN [standard_reading] DECIMAL(18,10) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_reading_session_point'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_readings]')
)
AND COL_LENGTH('dbo.calibration_readings', 'point_id') IS NOT NULL
BEGIN
    CREATE INDEX [IX_cal_reading_session_point]
        ON [dbo].[calibration_readings] ([session_id], [point_id], [cycle_code]);
END
GO

-- -----------------------------------------------------------------------------
-- 4) calibration_regression_inputs
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_regression_inputs]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_regression_inputs] (
        [regression_id]       INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [point_id]            INT              NULL,
        [direction]           VARCHAR(20)      NOT NULL,
        [x_variable]          DECIMAL(18,12)   NOT NULL,
        [intercept]           DECIMAL(18,12)   NOT NULL,
        [source_type]         VARCHAR(30)      NOT NULL DEFAULT 'MANUAL',
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT CK_cal_reg_direction
            CHECK ([direction] IN ('INCREASING', 'DECREASING')),
        CONSTRAINT CK_cal_reg_source
            CHECK ([source_type] IN ('MANUAL', 'STANDARD_POINTS', 'IMPORTED_EXCEL')),
        CONSTRAINT FK_cal_reg_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id]),
        CONSTRAINT FK_cal_reg_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[calibration_nominal_points]([point_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_reg_session_direction'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_regression_inputs]')
)
BEGIN
    CREATE INDEX [IX_cal_reg_session_direction]
        ON [dbo].[calibration_regression_inputs] ([session_id], [direction], [point_id]);
END
GO

-- -----------------------------------------------------------------------------
-- 5) calibration_corrected_readings
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_corrected_readings]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_corrected_readings] (
        [corrected_id]                INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                  INT              NOT NULL,
        [point_id]                    INT              NOT NULL,
        [reading_id]                  INT              NOT NULL,
        [cycle_code]                  VARCHAR(10)      NOT NULL,
        [direction]                   VARCHAR(20)      NOT NULL,
        [uut_reading]                 DECIMAL(18,10)   NULL,
        [raw_standard_reading]        DECIMAL(18,10)   NULL,
        [corrected_standard_reading]  DECIMAL(18,10)   NULL,
        [x_variable]                  DECIMAL(18,12)   NULL,
        [intercept]                   DECIMAL(18,12)   NULL,
        [created_at]                  DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_cal_corrected_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id]),
        CONSTRAINT FK_cal_corrected_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[calibration_nominal_points]([point_id]),
        CONSTRAINT FK_cal_corrected_reading
            FOREIGN KEY ([reading_id]) REFERENCES [dbo].[calibration_readings]([reading_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_corrected_session_point'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_corrected_readings]')
)
BEGIN
    CREATE INDEX [IX_cal_corrected_session_point]
        ON [dbo].[calibration_corrected_readings] ([session_id], [point_id], [cycle_code]);
END
GO

-- -----------------------------------------------------------------------------
-- 6) calibration_level_corrections
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_level_corrections]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_level_corrections] (
        [level_correction_id]         INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                  INT              NOT NULL,
        [delta_h]                     DECIMAL(18,10)   NOT NULL DEFAULT 0.02,
        [media_density]               DECIMAL(18,10)   NOT NULL DEFAULT 1.2,
        [gravity]                     DECIMAL(18,10)   NOT NULL DEFAULT 9.78,
        [correction_pascal]           DECIMAL(18,10)   NULL,
        [correction_session_unit]     DECIMAL(18,10)   NULL,
        [session_unit]                VARCHAR(20)      NOT NULL,
        [created_at]                  DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]                  DATETIME         NULL,
        CONSTRAINT FK_cal_level_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_cal_level_session'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_level_corrections]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_cal_level_session]
        ON [dbo].[calibration_level_corrections] ([session_id]);
END
GO

-- -----------------------------------------------------------------------------
-- 7) calibration_uncertainty_inputs
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_uncertainty_inputs]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_uncertainty_inputs] (
        [uncertainty_input_id]                INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                          INT              NOT NULL,
        [standard_uncertainty]                DECIMAL(18,10)   NULL,
        [metal_rule_uncertainty]              DECIMAL(18,10)   NULL,
        [instrument_resolution]               DECIMAL(18,10)   NULL,
        [indicator_type]                      VARCHAR(20)      NULL,
        [analog_resolution_factor]            DECIMAL(18,10)   NOT NULL DEFAULT 0.2,
        [digital_resolution_factor]           DECIMAL(18,10)   NOT NULL DEFAULT 0.5,
        [standard_sensitivity_coefficient]    DECIMAL(18,10)   NULL,
        [metal_rule_sensitivity_coefficient]  DECIMAL(18,10)   NULL,
        [created_at]                          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]                          DATETIME         NULL,
        CONSTRAINT CK_cal_unc_input_indicator
            CHECK ([indicator_type] IN ('ANALOG', 'DIGITAL') OR [indicator_type] IS NULL),
        CONSTRAINT FK_cal_unc_input_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_cal_unc_input_session'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_uncertainty_inputs]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_cal_unc_input_session]
        ON [dbo].[calibration_uncertainty_inputs] ([session_id]);
END
GO

-- -----------------------------------------------------------------------------
-- 8) calibration_uncertainty_components
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_uncertainty_components]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_uncertainty_components] (
        [component_id]                 INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                   INT              NOT NULL,
        [component_order]              INT              NOT NULL,
        [component_name]               VARCHAR(255)     NOT NULL,
        [unit]                         VARCHAR(20)      NULL,
        [uncertainty_type]             VARCHAR(10)      NULL,
        [distribution]                 VARCHAR(30)      NULL,
        [u_value]                      DECIMAL(18,10)   NULL,
        [divisor]                      DECIMAL(18,10)   NULL,
        [degree_freedom]               DECIMAL(18,10)   NULL,
        [ui_value]                     DECIMAL(18,10)   NULL,
        [sensitivity_coefficient]      DECIMAL(18,10)   NULL,
        [uici]                         DECIMAL(18,10)   NULL,
        [uici_squared]                 DECIMAL(18,10)   NULL,
        [uici_fourth_over_vi]          DECIMAL(18,10)   NULL,
        [is_auto_generated]            BIT              NOT NULL DEFAULT 1,
        [created_at]                   DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_cal_unc_type
            CHECK ([uncertainty_type] IN ('A', 'B') OR [uncertainty_type] IS NULL),
        CONSTRAINT CK_cal_unc_distribution
            CHECK ([distribution] IN ('RECT', 'NORMAL') OR [distribution] IS NULL),
        CONSTRAINT FK_cal_unc_components_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_unc_components_session'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_uncertainty_components]')
)
BEGIN
    CREATE INDEX [IX_cal_unc_components_session]
        ON [dbo].[calibration_uncertainty_components] ([session_id], [component_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 9) calibration_results
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_results]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_results] (
        [result_id]            INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]           INT              NOT NULL,
        [point_id]             INT              NOT NULL,
        [point_order]          INT              NOT NULL,
        [nominal_value]        DECIMAL(18,10)   NOT NULL,
        [unit]                 VARCHAR(20)      NOT NULL,
        [inc_standard_avg]     DECIMAL(18,10)   NULL,
        [inc_uut_avg]          DECIMAL(18,10)   NULL,
        [inc_error]            DECIMAL(18,10)   NULL,
        [dec_standard_avg]     DECIMAL(18,10)   NULL,
        [dec_uut_avg]          DECIMAL(18,10)   NULL,
        [dec_error]            DECIMAL(18,10)   NULL,
        [repeatability]        DECIMAL(18,10)   NULL,
        [zero_deviation]       DECIMAL(18,10)   NULL,
        [mean_standard]        DECIMAL(18,10)   NULL,
        [mean_uut]             DECIMAL(18,10)   NULL,
        [level_correction]     DECIMAL(18,10)   NULL,
        [final_error]          DECIMAL(18,10)   NULL,
        [created_at]           DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_cal_results_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id]),
        CONSTRAINT FK_cal_results_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[calibration_nominal_points]([point_id])
    );
END
GO

-- -----------------------------------------------------------------------------
-- Compatibility patch for existing legacy calibration_results table
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[calibration_results]', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.calibration_results', 'point_id') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [point_id] INT NULL;

    IF COL_LENGTH('dbo.calibration_results', 'point_order') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [point_order] INT NULL;

    IF COL_LENGTH('dbo.calibration_results', 'unit') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [unit] VARCHAR(20) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'inc_standard_avg') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [inc_standard_avg] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'inc_uut_avg') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [inc_uut_avg] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'inc_error') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [inc_error] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'dec_standard_avg') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [dec_standard_avg] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'dec_uut_avg') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [dec_uut_avg] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'dec_error') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [dec_error] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'mean_standard') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [mean_standard] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'mean_uut') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [mean_uut] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'final_error') IS NULL
        ALTER TABLE [dbo].[calibration_results] ADD [final_error] DECIMAL(18,10) NULL;

    IF COL_LENGTH('dbo.calibration_results', 'point_index') IS NOT NULL
       AND COLUMNPROPERTY(OBJECT_ID('dbo.calibration_results'), 'point_index', 'AllowsNull') = 0
        ALTER TABLE [dbo].[calibration_results] ALTER COLUMN [point_index] INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_results_session_point'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_results]')
)
AND COL_LENGTH('dbo.calibration_results', 'point_order') IS NOT NULL
BEGIN
    CREATE INDEX [IX_cal_results_session_point]
        ON [dbo].[calibration_results] ([session_id], [point_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 10) calibration_result_summary
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_result_summary]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_result_summary] (
        [summary_id]                 INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]                 INT              NOT NULL,
        [combined_uncertainty]       DECIMAL(18,10)   NULL,
        [effective_degree_freedom]   DECIMAL(18,10)   NULL,
        [coverage_factor]            DECIMAL(18,10)   NULL,
        [expanded_uncertainty]       DECIMAL(18,10)   NULL,
        [created_at]                 DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_cal_summary_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[calibration_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_cal_summary_session'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_result_summary]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_cal_summary_session]
        ON [dbo].[calibration_result_summary] ([session_id]);
END
GO

-- -----------------------------------------------------------------------------
-- 11) pressure_conversion_factors
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[pressure_conversion_factors]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[pressure_conversion_factors] (
        [conversion_id]      INT              IDENTITY(1,1) PRIMARY KEY,
        [from_unit]          VARCHAR(20)      NOT NULL,
        [to_unit]            VARCHAR(20)      NOT NULL,
        [factor]             DECIMAL(24,12)   NOT NULL,
        [created_at]         DATETIME         NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_pressure_conversion_pair'
      AND object_id = OBJECT_ID(N'[dbo].[pressure_conversion_factors]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_pressure_conversion_pair]
        ON [dbo].[pressure_conversion_factors] ([from_unit], [to_unit]);
END
GO

-- -----------------------------------------------------------------------------
-- 12) calibration_audit_logs
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_audit_logs]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_audit_logs] (
        [audit_id]            INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NULL,
        [entity_name]         VARCHAR(100)     NOT NULL,
        [entity_id]           INT              NULL,
        [action_type]         VARCHAR(20)      NOT NULL,
        [old_value]           VARCHAR(MAX)     NULL,
        [new_value]           VARCHAR(MAX)     NULL,
        [changed_by]          VARCHAR(100)     NULL,
        [changed_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_cal_audit_action
            CHECK ([action_type] IN ('CREATE', 'UPDATE', 'DELETE', 'CALCULATE', 'FINALIZE'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_cal_audit_session'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_audit_logs]')
)
BEGIN
    CREATE INDEX [IX_cal_audit_session]
        ON [dbo].[calibration_audit_logs] ([session_id], [changed_at]);
END
GO

-- -----------------------------------------------------------------------------
-- Optional template tables for seeding default nominal point templates
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_point_templates]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_point_templates] (
        [template_id]         INT              IDENTITY(1,1) PRIMARY KEY,
        [template_code]       VARCHAR(100)     NOT NULL,
        [template_name]       VARCHAR(255)     NOT NULL,
        [unit_mode]           VARCHAR(20)      NOT NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_cal_template_unit_mode
            CHECK ([unit_mode] IN ('PA', 'BAR'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_cal_template_code'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_point_templates]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_cal_template_code]
        ON [dbo].[calibration_point_templates] ([template_code]);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[calibration_point_template_items]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[calibration_point_template_items] (
        [template_item_id]    INT              IDENTITY(1,1) PRIMARY KEY,
        [template_id]         INT              NOT NULL,
        [point_order]         INT              NOT NULL,
        [nominal_value]       DECIMAL(18,10)   NOT NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_cal_template_items_template
            FOREIGN KEY ([template_id]) REFERENCES [dbo].[calibration_point_templates]([template_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_cal_template_items_unique'
      AND object_id = OBJECT_ID(N'[dbo].[calibration_point_template_items]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_cal_template_items_unique]
        ON [dbo].[calibration_point_template_items] ([template_id], [point_order]);
END
GO

PRINT 'Calibration workbook tables migration completed.';
