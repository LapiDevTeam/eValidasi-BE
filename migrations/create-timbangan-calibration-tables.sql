-- =============================================================================
-- Timbangan (Electronic Balance) Calibration Workbook Module
-- Recreates "TIMBANGAN.xls" (INPUT FORM / HASIL HITUNG / HASIL EVALUASI).
-- SQL Server 2008 compatible migration (idempotent).
--
-- Tables:
--   timbangan_sessions          header: UUT identity, conditions, standard identity
--   timbangan_preadjust_rows    I.  Pre-adjustment AT rows
--   timbangan_repeatability     II. Daya ulang (10 rows: half & max capacity, z/r)
--   timbangan_points            III. measurement points (10)
--   timbangan_point_standards   AT weights stacked per point (+ per-row readings)
--   timbangan_eccentricity      IV. Efek beban tidak terpusat (5 positions x 2 reads)
--   timbangan_hysteresis        V. Hysteresis rows
--   timbangan_results           per-point error + uncertainty budget
--   timbangan_result_summary    overall: Sr/Sres/k, CMAX, LOP, hysteresis, conclusion
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) timbangan_sessions
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_sessions]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_sessions] (
        [session_id]          INT             IDENTITY(1,1) PRIMARY KEY,
        [session_code]        VARCHAR(50)     NULL,
        -- Instrument (UUT) identity
        [instrument_id]       VARCHAR(50)     NULL,
        [instrument_code]     VARCHAR(100)    NULL,
        [instrument_name]     VARCHAR(255)    NULL,
        [merk_tipe]           VARCHAR(255)    NULL,
        [no_seri]             VARCHAR(255)    NULL,
        [kapasitas_ukur]      DECIMAL(18,6)   NULL,    -- KAPASITAS UKUR (F1)
        [kapasitas_alat]      DECIMAL(18,6)   NULL,    -- KAPASITAS ALAT (F3)
        [unit]                VARCHAR(10)      NOT NULL DEFAULT 'kg',
        [resolusi]            DECIMAL(18,10)   NULL,    -- calc resolution (F2)
        [kapasitas_resolusi]  VARCHAR(100)    NULL,    -- nameplate label "30 kg / 0.01 kg"
        [lokasi]              VARCHAR(255)    NULL,
        [calibration_date]    DATE            NULL,
        [interval_bulan]      VARCHAR(50)     NULL,
        [metode_kalibrasi]    VARCHAR(255)    NULL,
        [keterangan]          VARCHAR(1000)   NULL,    -- CATATAN / model pan
        -- Environment
        [temperature]         DECIMAL(18,6)   NULL,
        [humidity]            DECIMAL(18,6)   NULL,
        -- Standard (reference) identity — II. IDENTITAS STANDAR (auto-derived, editable)
        [std_nama]            VARCHAR(255)    NULL,
        [std_no_identitas]    VARCHAR(500)    NULL,
        [std_no_sertifikat]   VARCHAR(1000)   NULL,
        [std_tertelusur]      VARCHAR(500)    NULL,
        [std_rekalibrasi]     VARCHAR(500)    NULL,
        -- Certificate / DA linkage
        [qa_id]               VARCHAR(50)     NULL,
        [id_no_sertifikat]    VARCHAR(50)     NULL,
        -- Lifecycle
        [status]              VARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
        [pic]                 VARCHAR(100)    NULL,
        [conclusion]          VARCHAR(80)     NULL,
        [created_by]          VARCHAR(100)    NULL,
        [updated_by]          VARCHAR(100)    NULL,
        [created_at]          DATETIME        NOT NULL DEFAULT GETDATE(),
        [updated_at]          DATETIME        NULL,
        CONSTRAINT CK_timbangan_session_status
            CHECK ([status] IN ('DRAFT','CALCULATED','FINALIZED','PUBLISHED','CANCELLED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_timbangan_sessions_status' AND object_id = OBJECT_ID(N'[dbo].[timbangan_sessions]'))
    CREATE INDEX [IX_timbangan_sessions_status] ON [dbo].[timbangan_sessions] ([status], [created_at]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_timbangan_sessions_certificate_lookup' AND object_id = OBJECT_ID(N'[dbo].[timbangan_sessions]'))
    CREATE INDEX [IX_timbangan_sessions_certificate_lookup] ON [dbo].[timbangan_sessions] ([qa_id], [id_no_sertifikat], [status]);
GO

-- -----------------------------------------------------------------------------
-- 2) timbangan_preadjust_rows  (I. PRE ADJUSTMENT)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_preadjust_rows]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_preadjust_rows] (
        [row_id]          INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]      INT            NOT NULL,
        [row_order]       INT            NOT NULL,
        [at_no_id]        VARCHAR(20)    NULL,
        [konvensional_g]  DECIMAL(18,6)  NOT NULL DEFAULT 0,
        [uut_reading]     DECIMAL(18,10) NOT NULL DEFAULT 0,
        [zero_reading]    DECIMAL(18,10) NOT NULL DEFAULT 0,
        CONSTRAINT FK_timbangan_preadj_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
    CREATE INDEX [IX_timbangan_preadj_session] ON [dbo].[timbangan_preadjust_rows] ([session_id], [row_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 3) timbangan_repeatability  (II. DAYA ULANG)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_repeatability]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_repeatability] (
        [rep_id]        INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]    INT            NOT NULL,
        [row_no]        INT            NOT NULL,    -- 1..10
        [half_zero]     DECIMAL(18,10) NOT NULL DEFAULT 0,
        [half_reading]  DECIMAL(18,10) NOT NULL DEFAULT 0,
        [max_zero]      DECIMAL(18,10) NOT NULL DEFAULT 0,
        [max_reading]   DECIMAL(18,10) NOT NULL DEFAULT 0,
        CONSTRAINT FK_timbangan_rep_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
    CREATE INDEX [IX_timbangan_rep_session] ON [dbo].[timbangan_repeatability] ([session_id], [row_no]);
END
GO

-- -----------------------------------------------------------------------------
-- 4) timbangan_points + 5) timbangan_point_standards  (III. KOREKSI)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_points]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_points] (
        [point_id]      INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]    INT            NOT NULL,
        [point_order]   INT            NOT NULL,
        [unit]          VARCHAR(10)    NOT NULL DEFAULT 'kg',
        [is_active]     BIT            NOT NULL DEFAULT 1,
        [created_at]    DATETIME       NOT NULL DEFAULT GETDATE(),
        [updated_at]    DATETIME       NULL,
        CONSTRAINT FK_timbangan_point_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
    CREATE INDEX [IX_timbangan_point_session] ON [dbo].[timbangan_points] ([session_id], [point_order], [is_active]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_point_standards]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_point_standards] (
        [pstd_id]         INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]      INT            NOT NULL,
        [point_id]        INT            NOT NULL,
        [row_order]       INT            NOT NULL,
        [at_no_id]        VARCHAR(20)    NULL,            -- AT number (lookup key)
        [konvensional_g]  DECIMAL(18,6)  NOT NULL DEFAULT 0,
        [uc_mg]           DECIMAL(18,6)  NOT NULL DEFAULT 0,
        [uut_reading]     DECIMAL(18,10) NOT NULL DEFAULT 0,
        [zero_reading]    DECIMAL(18,10) NOT NULL DEFAULT 0,
        CONSTRAINT FK_timbangan_pstd_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id]),
        CONSTRAINT FK_timbangan_pstd_point   FOREIGN KEY ([point_id])   REFERENCES [dbo].[timbangan_points]([point_id])
    );
    CREATE INDEX [IX_timbangan_pstd_point] ON [dbo].[timbangan_point_standards] ([point_id], [row_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 6) timbangan_eccentricity  (IV. EFEK BEBAN TIDAK TERPUSAT)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_eccentricity]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_eccentricity] (
        [ecc_id]      INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]  INT            NOT NULL,
        [position]    INT            NOT NULL,    -- 0..4 (0 = center)
        [baca1]       DECIMAL(18,10) NOT NULL DEFAULT 0,
        [baca2]       DECIMAL(18,10) NOT NULL DEFAULT 0,
        CONSTRAINT FK_timbangan_ecc_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
    CREATE INDEX [IX_timbangan_ecc_session] ON [dbo].[timbangan_eccentricity] ([session_id], [position]);
END
GO

-- -----------------------------------------------------------------------------
-- 7) timbangan_hysteresis  (V. HYSTERESIS)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_hysteresis]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_hysteresis] (
        [hys_id]      INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]  INT            NOT NULL,
        [row_order]   INT            NOT NULL,
        [label]       VARCHAR(20)    NULL,        -- M / M+M' / Z
        [col1]        DECIMAL(18,10) NULL,
        [col2]        DECIMAL(18,10) NULL,
        CONSTRAINT FK_timbangan_hys_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
    CREATE INDEX [IX_timbangan_hys_session] ON [dbo].[timbangan_hysteresis] ([session_id], [row_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 8) timbangan_results  (per-point error + uncertainty)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_results]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_results] (
        [result_id]       INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]      INT            NOT NULL,
        [point_id]        INT            NOT NULL,
        [point_order]     INT            NOT NULL,
        [unit]            VARCHAR(10)    NOT NULL,
        [konv_mass]       DECIMAL(18,10) NULL,    -- conventional mass (kg)
        [reading]         DECIMAL(18,10) NULL,    -- net reading (r - z)
        [error]           DECIMAL(18,10) NULL,
        [u_repeatability] DECIMAL(18,12) NULL,
        [u_resolusi]      DECIMAL(18,12) NULL,
        [u_sertifikat]    DECIMAL(18,12) NULL,
        [u_combined]      DECIMAL(18,12) NULL,
        [u_expanded]      DECIMAL(18,12) NULL,    -- k = 2
        [tolerance]       DECIMAL(18,10) NULL,
        [pass_flag]       BIT            NULL,
        [created_at]      DATETIME       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_timbangan_result_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id]),
        CONSTRAINT FK_timbangan_result_point   FOREIGN KEY ([point_id])   REFERENCES [dbo].[timbangan_points]([point_id])
    );
    CREATE INDEX [IX_timbangan_result_session] ON [dbo].[timbangan_results] ([session_id], [point_order]);
END
GO

-- -----------------------------------------------------------------------------
-- 9) timbangan_result_summary
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_result_summary]') AND type = 'U')
BEGIN
    CREATE TABLE [dbo].[timbangan_result_summary] (
        [summary_id]          INT            IDENTITY(1,1) PRIMARY KEY,
        [session_id]          INT            NOT NULL,
        [sr_half]             DECIMAL(18,12) NULL,
        [sr_max]              DECIMAL(18,12) NULL,
        [sres]                DECIMAL(18,12) NULL,
        [k_half]              DECIMAL(18,10) NULL,
        [k_max]               DECIMAL(18,10) NULL,
        [avg_half_zero]       DECIMAL(18,10) NULL,
        [avg_half_reading]    DECIMAL(18,10) NULL,
        [avg_max_zero]        DECIMAL(18,10) NULL,
        [avg_max_reading]     DECIMAL(18,10) NULL,
        [preadjust_result]    DECIMAL(18,10) NULL,
        [preadjust_error]     DECIMAL(18,10) NULL,
        [eccentricity_max]    DECIMAL(18,10) NULL,
        [hysteresis]          DECIMAL(18,10) NULL,
        [cmax]                DECIMAL(18,12) NULL,
        [u_cmax]              DECIMAL(18,12) NULL,
        [sr_max_used]         DECIMAL(18,12) NULL,
        [lop]                 DECIMAL(18,12) NULL,
        [coverage_factor]     DECIMAL(18,10) NULL,
        [max_expanded]        DECIMAL(18,12) NULL,
        [conclusion]          VARCHAR(80)    NULL,
        [created_at]          DATETIME       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_timbangan_summary_session FOREIGN KEY ([session_id]) REFERENCES [dbo].[timbangan_sessions]([session_id])
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_timbangan_summary_session' AND object_id = OBJECT_ID(N'[dbo].[timbangan_result_summary]'))
    CREATE UNIQUE INDEX [UX_timbangan_summary_session] ON [dbo].[timbangan_result_summary] ([session_id]);
GO
