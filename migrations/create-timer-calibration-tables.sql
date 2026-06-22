-- =============================================================================
-- Timer (Stopwatch) Calibration Workbook Module
-- Recreates "TIMER (Detik).xls" / "TIMER (Menit).xls"
-- SQL Server 2008 compatible migration (idempotent)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) timer_sessions
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timer_sessions]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timer_sessions] (
        [session_id]          INT              IDENTITY(1,1) PRIMARY KEY,
        [session_code]        VARCHAR(50)      NULL,
        -- Instrument (UUT) identity
        [instrument_id]       VARCHAR(50)      NULL,
        [instrument_code]     VARCHAR(100)     NULL,
        [instrument_name]     VARCHAR(255)     NULL,
        [merk_tipe]           VARCHAR(255)     NULL,
        [no_seri]             VARCHAR(255)     NULL,
        [kapasitas]           VARCHAR(255)     NULL,
        [resolusi]            VARCHAR(100)     NULL,
        [lokasi]              VARCHAR(255)     NULL,
        [calibration_date]    DATE             NULL,
        [interval_bulan]      VARCHAR(50)      NULL,
        [metode_kalibrasi]    VARCHAR(255)     NULL,
        [keterangan]          VARCHAR(1000)    NULL,
        -- Mode / configuration
        [unit_mode]           VARCHAR(20)      NOT NULL DEFAULT 'DETIK',
        [indicator_type]      VARCHAR(20)      NOT NULL DEFAULT 'DIGITAL',
        [tolerance]           DECIMAL(18,6)    NULL,
        [digital_resolution]  DECIMAL(18,10)   NULL,
        [analog_resolution]   DECIMAL(18,10)   NULL,
        -- Environment
        [temperature]         DECIMAL(18,6)    NULL,
        [humidity]            DECIMAL(18,6)    NULL,
        -- Standard (reference) identity
        [std_nama]            VARCHAR(255)     NULL,
        [std_no_identitas]    VARCHAR(255)     NULL,
        [std_no_sertifikat]   VARCHAR(255)     NULL,
        [std_tertelusur]      VARCHAR(255)     NULL,
        [std_rekalibrasi]     VARCHAR(255)     NULL,
        -- Certificate / DA linkage
        [qa_id]               VARCHAR(50)      NULL,
        [id_no_sertifikat]    VARCHAR(50)      NULL,
        -- Lifecycle
        [status]              VARCHAR(30)      NOT NULL DEFAULT 'DRAFT',
        [pic]                 VARCHAR(100)     NULL,
        [conclusion]          VARCHAR(50)      NULL,
        [created_by]          VARCHAR(100)     NULL,
        [updated_by]          VARCHAR(100)     NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT CK_timer_session_unit_mode
            CHECK ([unit_mode] IN ('DETIK', 'MENIT')),
        CONSTRAINT CK_timer_session_indicator
            CHECK ([indicator_type] IN ('DIGITAL', 'ANALOG')),
        CONSTRAINT CK_timer_session_status
            CHECK ([status] IN ('DRAFT', 'CALCULATED', 'FINALIZED', 'PUBLISHED', 'CANCELLED'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_timer_sessions_status'
      AND object_id = OBJECT_ID(N'[dbo].[timer_sessions]')
)
BEGIN
    CREATE INDEX [IX_timer_sessions_status]
        ON [dbo].[timer_sessions] ([status], [created_at]);
END
GO

-- -----------------------------------------------------------------------------
-- 2) timer_points  (measurement points / "TITIK UKUR")
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timer_points]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timer_points] (
        [point_id]            INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [point_order]         INT              NOT NULL,
        [nominal_value]       DECIMAL(18,6)    NOT NULL,
        [unit]                VARCHAR(20)      NOT NULL DEFAULT 'DETIK',
        [correction_std]      DECIMAL(18,10)   NOT NULL DEFAULT 0,   -- Correction (STD), col I
        [uc_std]              DECIMAL(18,10)   NOT NULL DEFAULT 0,   -- UC (STD), col J
        [is_active]           BIT              NOT NULL DEFAULT 1,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT CK_timer_point_unit
            CHECK ([unit] IN ('DETIK', 'MENIT')),
        CONSTRAINT FK_timer_point_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[timer_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_timer_point_session_order'
      AND object_id = OBJECT_ID(N'[dbo].[timer_points]')
)
BEGIN
    CREATE INDEX [IX_timer_point_session_order]
        ON [dbo].[timer_points] ([session_id], [point_order], [is_active]);
END
GO

-- -----------------------------------------------------------------------------
-- 3) timer_readings  (10 cycles per point; standard + UUT as H/M/S/ms)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timer_readings]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timer_readings] (
        [reading_id]          INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [point_id]            INT              NOT NULL,
        [cycle_no]            INT              NOT NULL,    -- 1..10
        -- Standard (reference) reading
        [std_jam]             DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [std_menit]           DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [std_detik]           DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [std_mdetik]          DECIMAL(18,6)    NOT NULL DEFAULT 0,
        -- UUT reading
        [uut_jam]             DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [uut_menit]           DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [uut_detik]           DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [uut_mdetik]          DECIMAL(18,6)    NOT NULL DEFAULT 0,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME         NULL,
        CONSTRAINT FK_timer_reading_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[timer_sessions]([session_id]),
        CONSTRAINT FK_timer_reading_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[timer_points]([point_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_timer_reading_point_cycle'
      AND object_id = OBJECT_ID(N'[dbo].[timer_readings]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_timer_reading_point_cycle]
        ON [dbo].[timer_readings] ([point_id], [cycle_no]);
END
GO

-- -----------------------------------------------------------------------------
-- 4) timer_results  (per-point computed error + uncertainty budget)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timer_results]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timer_results] (
        [result_id]           INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [point_id]            INT              NOT NULL,
        [point_order]         INT              NOT NULL,
        [nominal_value]       DECIMAL(18,6)    NOT NULL,
        [unit]                VARCHAR(20)      NOT NULL,
        [mean_std_sec]        DECIMAL(18,10)   NULL,
        [mean_uut_sec]        DECIMAL(18,10)   NULL,
        [mean_error_sec]      DECIMAL(18,10)   NULL,    -- reported Error (detik)
        [sd_sec]              DECIMAL(18,10)   NULL,
        [u_repeatability]     DECIMAL(18,10)   NULL,
        [u_digital_res]       DECIMAL(18,10)   NULL,
        [u_analog_res]        DECIMAL(18,10)   NULL,
        [u_certificate]       DECIMAL(18,10)   NULL,
        [u_combined]          DECIMAL(18,10)   NULL,
        [u_expanded_sec]      DECIMAL(18,10)   NULL,    -- expanded uncertainty (detik), k=2
        [u_expanded_menit]    DECIMAL(18,10)   NULL,
        [tolerance]           DECIMAL(18,6)    NULL,
        [pass_flag]           BIT              NULL,
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_timer_result_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[timer_sessions]([session_id]),
        CONSTRAINT FK_timer_result_point
            FOREIGN KEY ([point_id]) REFERENCES [dbo].[timer_points]([point_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_timer_result_session_point'
      AND object_id = OBJECT_ID(N'[dbo].[timer_results]')
)
BEGIN
    CREATE INDEX [IX_timer_result_session_point]
        ON [dbo].[timer_results] ([session_id], [point_order], [point_id]);
END
GO

-- -----------------------------------------------------------------------------
-- 5) timer_result_summary  (overall evaluation / conclusion)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timer_result_summary]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timer_result_summary] (
        [summary_id]          INT              IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT              NOT NULL,
        [coverage_factor]     DECIMAL(18,10)   NULL,
        [max_expanded_sec]    DECIMAL(18,10)   NULL,
        [conclusion]          VARCHAR(50)      NULL,    -- LAYAK DIGUNAKAN / TIDAK LAYAK DIGUNAKAN
        [created_at]          DATETIME         NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_timer_summary_session
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[timer_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_timer_summary_session'
      AND object_id = OBJECT_ID(N'[dbo].[timer_result_summary]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_timer_summary_session]
        ON [dbo].[timer_result_summary] ([session_id]);
END
GO
