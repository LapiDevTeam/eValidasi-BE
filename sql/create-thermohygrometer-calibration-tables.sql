IF OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
  (
    Session_ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    QA_ID NVARCHAR(50) NULL,
    ID_No_Sertifikat NVARCHAR(50) NULL,
    Include_RH BIT NOT NULL CONSTRAINT DF_ThermoWorkbook_Include_RH DEFAULT (0),
    Suhu_Repeat_Count INT NOT NULL CONSTRAINT DF_ThermoWorkbook_Suhu_Repeat DEFAULT (3),
    RH_Repeat_Count INT NULL,
    Suhu_Unit NVARCHAR(20) NOT NULL CONSTRAINT DF_ThermoWorkbook_Suhu_Unit DEFAULT (NCHAR(176) + N'C'),
    RH_Unit NVARCHAR(20) NULL,
    Suhu_Coefficient_Mode NVARCHAR(20) NOT NULL CONSTRAINT DF_ThermoWorkbook_Suhu_Mode DEFAULT (N'global'),
    RH_Coefficient_Mode NVARCHAR(20) NULL,
    Workbook_Payload_JSON NVARCHAR(MAX) NULL,
    Calculation_Result_JSON NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_ThermoWorkbook_Status DEFAULT (N'DRAFT'),
    UserID NVARCHAR(100) NULL,
    Delegated_To NVARCHAR(100) NULL,
    Process_Date DATETIME NOT NULL CONSTRAINT DF_ThermoWorkbook_ProcessDate DEFAULT (GETDATE()),
    Update_Date DATETIME NULL
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session', 'U') IS NOT NULL
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_ThermoWorkbook_QA_Sertifikat'
      AND object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
  )
  BEGIN
    DROP INDEX IX_ThermoWorkbook_QA_Sertifikat
    ON dbo.T_Kalibrasi_Thermohygro_Workbook_Session
  END

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
      AND name = 'QA_ID'
      AND is_nullable = 0
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    ALTER COLUMN QA_ID NVARCHAR(50) NULL
  END

  IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
      AND name = 'ID_No_Sertifikat'
      AND is_nullable = 0
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    ALTER COLUMN ID_No_Sertifikat NVARCHAR(50) NULL
  END

  IF OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist', 'U') IS NOT NULL
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist')
        AND name = 'QA_ID'
        AND is_nullable = 0
    )
    BEGIN
      ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist
      ALTER COLUMN QA_ID NVARCHAR(50) NULL
    END

    IF EXISTS (
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist')
        AND name = 'ID_No_Sertifikat'
        AND is_nullable = 0
    )
    BEGIN
      ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist
      ALTER COLUMN ID_No_Sertifikat NVARCHAR(50) NULL
    END
  END
  IF EXISTS (
    SELECT 1
    FROM sys.default_constraints
    WHERE name = 'DF_ThermoWorkbook_Suhu_Unit'
      AND parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    DROP CONSTRAINT DF_ThermoWorkbook_Suhu_Unit
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
      ON c.object_id = dc.parent_object_id
     AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
      AND c.name = 'Suhu_Unit'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    ADD CONSTRAINT DF_ThermoWorkbook_Suhu_Unit DEFAULT (NCHAR(176) + N'C') FOR Suhu_Unit
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_ThermoWorkbook_Repeat_Count'
      AND parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    ADD CONSTRAINT CK_ThermoWorkbook_Repeat_Count
    CHECK (
      Suhu_Repeat_Count BETWEEN 1 AND 12
      AND (RH_Repeat_Count IS NULL OR RH_Repeat_Count BETWEEN 1 AND 12)
    )
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_ThermoWorkbook_Mode'
      AND parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session
    ADD CONSTRAINT CK_ThermoWorkbook_Mode
    CHECK (
      Suhu_Coefficient_Mode IN (N'global', N'per-row')
      AND (RH_Coefficient_Mode IS NULL OR RH_Coefficient_Mode IN (N'global', N'per-row'))
    )
  END
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_ThermoWorkbook_QA_Sertifikat'
    AND object_id = OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session')
)
BEGIN
  CREATE INDEX IX_ThermoWorkbook_QA_Sertifikat
  ON dbo.T_Kalibrasi_Thermohygro_Workbook_Session
  (
    QA_ID,
    ID_No_Sertifikat,
    Session_ID DESC
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Session_ID BIGINT NOT NULL,
    QA_ID NVARCHAR(50) NULL,
    ID_No_Sertifikat NVARCHAR(50) NULL,
    Include_RH BIT NOT NULL,
    Suhu_Repeat_Count INT NOT NULL,
    RH_Repeat_Count INT NULL,
    Suhu_Unit NVARCHAR(20) NOT NULL,
    RH_Unit NVARCHAR(20) NULL,
    Suhu_Coefficient_Mode NVARCHAR(20) NOT NULL,
    RH_Coefficient_Mode NVARCHAR(20) NULL,
    Workbook_Payload_JSON NVARCHAR(MAX) NULL,
    Calculation_Result_JSON NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL,
    UserID NVARCHAR(100) NULL,
    Delegated_To NVARCHAR(100) NULL,
    Process_Date DATETIME NULL,
    Update_Date DATETIME NULL,
    Flag_Update CHAR(1) NOT NULL,
    Change_Date DATETIME NOT NULL CONSTRAINT DF_ThermoWorkbookHist_ChangeDate DEFAULT (GETDATE())
  )
END
GO

IF OBJECT_ID('dbo.TR_T_Kalibrasi_Thermohygro_Workbook_Session_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Kalibrasi_Thermohygro_Workbook_Session_Hist
END
GO

CREATE TRIGGER dbo.TR_T_Kalibrasi_Thermohygro_Workbook_Session_Hist
ON dbo.T_Kalibrasi_Thermohygro_Workbook_Session
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON

  INSERT INTO dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist
  (
    Session_ID,
    QA_ID,
    ID_No_Sertifikat,
    Include_RH,
    Suhu_Repeat_Count,
    RH_Repeat_Count,
    Suhu_Unit,
    RH_Unit,
    Suhu_Coefficient_Mode,
    RH_Coefficient_Mode,
    Workbook_Payload_JSON,
    Calculation_Result_JSON,
    Status,
    UserID,
    Delegated_To,
    Process_Date,
    Update_Date,
    Flag_Update
  )
  SELECT
    i.Session_ID,
    i.QA_ID,
    i.ID_No_Sertifikat,
    i.Include_RH,
    i.Suhu_Repeat_Count,
    i.RH_Repeat_Count,
    i.Suhu_Unit,
    i.RH_Unit,
    i.Suhu_Coefficient_Mode,
    i.RH_Coefficient_Mode,
    i.Workbook_Payload_JSON,
    i.Calculation_Result_JSON,
    i.Status,
    i.UserID,
    i.Delegated_To,
    i.Process_Date,
    i.Update_Date,
    CASE WHEN d.Session_ID IS NULL THEN 'I' ELSE 'U' END
  FROM inserted AS i
  LEFT JOIN deleted AS d ON d.Session_ID = i.Session_ID

  INSERT INTO dbo.T_Kalibrasi_Thermohygro_Workbook_Session_Hist
  (
    Session_ID,
    QA_ID,
    ID_No_Sertifikat,
    Include_RH,
    Suhu_Repeat_Count,
    RH_Repeat_Count,
    Suhu_Unit,
    RH_Unit,
    Suhu_Coefficient_Mode,
    RH_Coefficient_Mode,
    Workbook_Payload_JSON,
    Calculation_Result_JSON,
    Status,
    UserID,
    Delegated_To,
    Process_Date,
    Update_Date,
    Flag_Update
  )
  SELECT
    d.Session_ID,
    d.QA_ID,
    d.ID_No_Sertifikat,
    d.Include_RH,
    d.Suhu_Repeat_Count,
    d.RH_Repeat_Count,
    d.Suhu_Unit,
    d.RH_Unit,
    d.Suhu_Coefficient_Mode,
    d.RH_Coefficient_Mode,
    d.Workbook_Payload_JSON,
    d.Calculation_Result_JSON,
    d.Status,
    d.UserID,
    d.Delegated_To,
    d.Process_Date,
    d.Update_Date,
    'D'
  FROM deleted AS d
  LEFT JOIN inserted AS i ON i.Session_ID = d.Session_ID
  WHERE i.Session_ID IS NULL
END
GO


