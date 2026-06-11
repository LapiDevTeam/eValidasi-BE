IF OBJECT_ID('dbo.T_AWP_Header', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_AWP_Header
  (
    AWP_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_AWP_Header PRIMARY KEY,
    [Year] NVARCHAR(50) NOT NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_T_AWP_Header_Status DEFAULT ('REQUESTED'),
    Requested_By NVARCHAR(50) NULL,
    Requested_At DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_At DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_At DATETIME2(0) NULL,
    Notes NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_AWP_Header_Created_At DEFAULT (SYSDATETIME()),
    Updated_By NVARCHAR(50) NULL,
    Updated_At DATETIME2(0) NULL,
    CONSTRAINT UQ_T_AWP_Header_Year_Revision UNIQUE ([Year], Revision_No),
    CONSTRAINT CK_T_AWP_Header_Status CHECK ([Status] IN ('REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED'))
  );
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_AWP_Detail
  (
    AWP_Detail_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_AWP_Detail PRIMARY KEY,
    AWP_ID INT NOT NULL,
    Line_No INT NOT NULL,
    QA_ID NVARCHAR(100) NULL,
    Instrument_Name NVARCHAR(255) NULL,
    Instrument_ID NVARCHAR(100) NULL,
    Department NVARCHAR(100) NULL,
    [Location] NVARCHAR(255) NULL,
    Due_Date DATE NULL,
    Tgl_Kalibrasi DATE NULL,
    Parameter_Interval INT NULL,
    Plan_Month TINYINT NULL,
    Real_Month TINYINT NULL,
    Plan_Date DATE NULL,
    Real_Date DATE NULL,
    Plan_Dates_JSON NVARCHAR(MAX) NULL,
    Real_Dates_JSON NVARCHAR(MAX) NULL,
    Plan_Months_JSON NVARCHAR(MAX) NULL,
    Real_Months_JSON NVARCHAR(MAX) NULL,
    Revision_Status VARCHAR(20) NOT NULL CONSTRAINT DF_T_AWP_Detail_Revision_Status DEFAULT ('UNCHANGED'),
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL,
    CONSTRAINT FK_T_AWP_Detail_Header
      FOREIGN KEY (AWP_ID)
      REFERENCES dbo.T_AWP_Header (AWP_ID)
      ON DELETE CASCADE,
    CONSTRAINT CK_T_AWP_Detail_Plan_Month CHECK (Plan_Month IS NULL OR Plan_Month BETWEEN 1 AND 12),
    CONSTRAINT CK_T_AWP_Detail_Real_Month CHECK (Real_Month IS NULL OR Real_Month BETWEEN 1 AND 12),
    CONSTRAINT CK_T_AWP_Detail_Revision_Status CHECK (Revision_Status IN ('UNCHANGED', 'ADDED', 'CHANGED', 'REMOVED'))
  );
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail', 'Plan_Dates_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail ADD Plan_Dates_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail', 'Real_Dates_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail ADD Real_Dates_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail', 'Plan_Months_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail ADD Plan_Months_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail', 'Real_Months_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail ADD Real_Months_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail', 'Revision_Status') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail
    ADD Revision_Status VARCHAR(20) NOT NULL
      CONSTRAINT DF_T_AWP_Detail_Revision_Status DEFAULT ('UNCHANGED');
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_T_AWP_Detail_Revision_Status'
      AND parent_object_id = OBJECT_ID('dbo.T_AWP_Detail')
  )
BEGIN
  ALTER TABLE dbo.T_AWP_Detail
    ADD CONSTRAINT CK_T_AWP_Detail_Revision_Status
      CHECK (Revision_Status IN ('UNCHANGED', 'ADDED', 'CHANGED', 'REMOVED'));
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_AWP_Header_Year_Status'
    AND object_id = OBJECT_ID('dbo.T_AWP_Header')
)
BEGIN
  CREATE INDEX IX_T_AWP_Header_Year_Status
    ON dbo.T_AWP_Header ([Year], [Status], Revision_No DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_AWP_Detail_AWP_Line'
    AND object_id = OBJECT_ID('dbo.T_AWP_Detail')
)
BEGIN
  CREATE INDEX IX_T_AWP_Detail_AWP_Line
    ON dbo.T_AWP_Detail (AWP_ID, Line_No);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_T_AWP_Detail_AWP_QA_ID'
    AND object_id = OBJECT_ID('dbo.T_AWP_Detail')
)
AND NOT EXISTS (
  SELECT 1
  FROM dbo.T_AWP_Detail
  WHERE QA_ID IS NOT NULL
  GROUP BY AWP_ID, QA_ID
  HAVING COUNT(*) > 1
)
BEGIN
  CREATE UNIQUE INDEX UX_T_AWP_Detail_AWP_QA_ID
    ON dbo.T_AWP_Detail (AWP_ID, QA_ID)
    WHERE QA_ID IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_AWP_Detail_AWP_QA_ID'
    AND object_id = OBJECT_ID('dbo.T_AWP_Detail')
)
AND NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_T_AWP_Detail_AWP_QA_ID'
    AND object_id = OBJECT_ID('dbo.T_AWP_Detail')
)
BEGIN
  CREATE INDEX IX_T_AWP_Detail_AWP_QA_ID
    ON dbo.T_AWP_Detail (AWP_ID, QA_ID)
    WHERE QA_ID IS NOT NULL;
END;
GO
