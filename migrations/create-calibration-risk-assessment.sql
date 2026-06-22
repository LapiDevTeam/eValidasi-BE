-- ============================================================
-- Migration: Create RA_CalibrationAssessment table
-- Compatible with MSSQL Server 2008
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

    -- D. Calibration Decision
    -- RPN = Severity x Probability x Detectability
    -- RPN >= 40        -> Tinggi   / WAJIB DIKALIBRASI
    -- RPN 20-39        -> Sedang   / Kalibrasi / Kontrol Alternatif
    -- RPN < 20         -> Rendah   / Tidak Perlu Kalibrasi
    RPN                   INT NULL,
    RiskCategory          NVARCHAR(50)    NULL,       -- Tinggi / Sedang / Rendah
    CalibrationDecision   NVARCHAR(255)   NOT NULL,
    DecisionReason        NVARCHAR(MAX)   NULL,

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

  PRINT 'Table RA_CalibrationAssessment created successfully.';
END
ELSE
BEGIN
  PRINT 'Table RA_CalibrationAssessment already exists. Skipping creation.';
END
GO
