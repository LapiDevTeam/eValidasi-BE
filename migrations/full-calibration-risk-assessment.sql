-- ============================================================
-- Full Migration: RA_CalibrationAssessment
-- Combines all migrations for this table into one idempotent script.
-- Safe to run on a fresh DB or an existing DB — all steps are guarded.
-- Compatible with MSSQL Server 2008+
-- ============================================================

-- ============================================================
-- STEP 1: Create table (if not exists)
-- ============================================================
IF NOT EXISTS (
  SELECT * FROM sysobjects WHERE name = 'RA_CalibrationAssessment' AND xtype = 'U'
)
BEGIN
  CREATE TABLE RA_CalibrationAssessment (
    -- Primary Key
    AssessmentID          INT             IDENTITY(1,1) PRIMARY KEY,

    -- A. Informasi Alat
    InstrumentName        NVARCHAR(255)   NOT NULL,
    InstrumentCode        NVARCHAR(100)   NULL,
    Location              NVARCHAR(255)   NULL,
    FunctionDescription   NVARCHAR(MAX)   NULL,
    Area                  NVARCHAR(255)   NULL,

    -- B. Impact Assessment (Yes = 1, No = 0)
    ImpactsProductQualityCQA  BIT NOT NULL CONSTRAINT DF_RA_ImpactsProductQualityCQA  DEFAULT 0,
    UsedForCPP                BIT NOT NULL CONSTRAINT DF_RA_UsedForCPP                DEFAULT 0,
    UsedForGxPEnvironment     BIT NOT NULL CONSTRAINT DF_RA_UsedForGxPEnvironment     DEFAULT 0,
    UsedForBatchRelease       BIT NOT NULL CONSTRAINT DF_RA_UsedForBatchRelease       DEFAULT 0,
    ImpactsSafety             BIT NOT NULL CONSTRAINT DF_RA_ImpactsSafety             DEFAULT 0,

    -- Computed flag: any impact = Yes
    IsImpactCritical      BIT NOT NULL CONSTRAINT DF_RA_IsImpactCritical DEFAULT 0,

    -- C. Risk Scoring (allowed values: 1, 3, 5 | NULL when IsImpactCritical = 1)
    -- Severity:      1=Tidak berdampak, 3=Minor, 5=Major
    -- Probability:   1=Jarang,          3=Kadang, 5=Sering
    -- Detectability: 1=Mudah terdeteksi, 3=Sedang, 5=Sulit
    Severity              INT NULL,
    Probability           INT NULL,
    Detectability         INT NULL,

    -- C. Justifikasi per parameter (free text, optional)
    SeverityNote          NVARCHAR(MAX)   NULL,
    ProbabilityNote       NVARCHAR(MAX)   NULL,
    DetectabilityNote     NVARCHAR(MAX)   NULL,

    -- D. Calibration Decision
    -- RPN = Severity x Probability x Detectability
    -- RPN >= 40        -> Tinggi   / WAJIB DIKALIBRASI
    -- RPN 20-39        -> Sedang   / Kalibrasi / Kontrol Alternatif
    -- RPN < 20         -> Rendah   / Tidak Perlu Kalibrasi
    RPN                   INT NULL,
    RiskCategory          NVARCHAR(50)    NULL,       -- Tinggi / Sedang / Rendah
    CalibrationDecision   NVARCHAR(255)   NOT NULL,
    DecisionReason        NVARCHAR(MAX)   NULL,

    -- DA instrument identity fields
    QA_ID                        NVARCHAR(50)    NULL,
    Assm_No_identitas_kalibrasi  NVARCHAR(100)   NULL,
    Group_Da_Dept                NVARCHAR(50)    NULL,
    Assm_Kapasitas               NVARCHAR(100)   NULL,
    Parameter_Kalibrasi          NVARCHAR(100)   NULL,
    No_Permohonan                NVARCHAR(50)    NULL,

    -- Workflow
    Status                NVARCHAR(50)    NOT NULL CONSTRAINT DF_RA_Status    DEFAULT 'Draft',
    -- Allowed: Draft | Submitted | Reviewed | Approved | Rejected | Cancelled

    -- Soft delete
    IsDeleted             BIT NOT NULL CONSTRAINT DF_RA_IsDeleted DEFAULT 0,

    -- Audit
    CreatedBy             NVARCHAR(100)   NULL,
    CreatedAt             DATETIME        NOT NULL CONSTRAINT DF_RA_CreatedAt DEFAULT GETDATE(),
    UpdatedBy             NVARCHAR(100)   NULL,
    UpdatedAt             DATETIME        NULL
  );

  PRINT 'STEP 1: Table RA_CalibrationAssessment created.';
END
ELSE
BEGIN
  PRINT 'STEP 1: Table RA_CalibrationAssessment already exists. Skipping creation.';
END
GO

-- ============================================================
-- STEP 2: Add DA instrument identity columns (if not exists)
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'QA_ID'
)
  ALTER TABLE RA_CalibrationAssessment ADD QA_ID NVARCHAR(50) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Assm_No_identitas_kalibrasi'
)
  ALTER TABLE RA_CalibrationAssessment ADD Assm_No_identitas_kalibrasi NVARCHAR(100) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Group_Da_Dept'
)
  ALTER TABLE RA_CalibrationAssessment ADD Group_Da_Dept NVARCHAR(50) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Assm_Kapasitas'
)
  ALTER TABLE RA_CalibrationAssessment ADD Assm_Kapasitas NVARCHAR(100) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'Parameter_Kalibrasi'
)
  ALTER TABLE RA_CalibrationAssessment ADD Parameter_Kalibrasi NVARCHAR(100) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'No_Permohonan'
)
  ALTER TABLE RA_CalibrationAssessment ADD No_Permohonan NVARCHAR(50) NULL;

PRINT 'STEP 2: DA identity columns verified/added.';
GO

-- ============================================================
-- STEP 2B: Add FK from risk assessment to permohonan (if not exists)
-- ============================================================
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

PRINT 'STEP 2B: Permohonan FK verified/added.';
GO

-- ============================================================
-- STEP 3: Add Justifikasi (note) columns (if not exists)
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'SeverityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD SeverityNote NVARCHAR(MAX) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'ProbabilityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD ProbabilityNote NVARCHAR(MAX) NULL;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'RA_CalibrationAssessment' AND COLUMN_NAME = 'DetectabilityNote'
)
  ALTER TABLE RA_CalibrationAssessment ADD DetectabilityNote NVARCHAR(MAX) NULL;

PRINT 'STEP 3: Justifikasi columns verified/added.';
GO

PRINT '============================================================';
PRINT 'Full migration for RA_CalibrationAssessment complete.';
PRINT '============================================================';
