IF OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session
  (
    Session_ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    QA_ID NVARCHAR(50) NULL,
    ID_No_Sertifikat NVARCHAR(50) NULL,
    Workbook_Payload_JSON NVARCHAR(MAX) NULL,
    Calculation_Result_JSON NVARCHAR(MAX) NULL,
    Evaluation_Result NVARCHAR(100) NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_DissolutionWorkbook_Status DEFAULT (N'DRAFT'),
    ApprovedByAdmin NVARCHAR(100) NULL,
    ApprovedByAdminDate DATETIME NULL,
    ApprovedByOfficer NVARCHAR(100) NULL,
    ApprovedByOfficerDate DATETIME NULL,
    ApprovedByManager NVARCHAR(100) NULL,
    ApprovedByManagerDate DATETIME NULL,
    UserID NVARCHAR(100) NULL,
    Delegated_To NVARCHAR(100) NULL,
    Process_Date DATETIME NOT NULL CONSTRAINT DF_DissolutionWorkbook_ProcessDate DEFAULT (GETDATE()),
    Update_Date DATETIME NULL
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session')
      AND name = 'Evaluation_Result'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session
    ADD Evaluation_Result NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session')
      AND name = 'ApprovedByAdmin'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session
    ADD
      ApprovedByAdmin NVARCHAR(100) NULL,
      ApprovedByAdminDate DATETIME NULL,
      ApprovedByOfficer NVARCHAR(100) NULL,
      ApprovedByOfficerDate DATETIME NULL,
      ApprovedByManager NVARCHAR(100) NULL,
      ApprovedByManagerDate DATETIME NULL
  END
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_DissolutionWorkbook_QA_Sertifikat'
    AND object_id = OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session')
)
BEGIN
  CREATE INDEX IX_DissolutionWorkbook_QA_Sertifikat
  ON dbo.T_Kalibrasi_DissolutionTester_Workbook_Session
  (
    QA_ID,
    ID_No_Sertifikat,
    Session_ID DESC
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Session_ID BIGINT NOT NULL,
    QA_ID NVARCHAR(50) NULL,
    ID_No_Sertifikat NVARCHAR(50) NULL,
    Workbook_Payload_JSON NVARCHAR(MAX) NULL,
    Calculation_Result_JSON NVARCHAR(MAX) NULL,
    Evaluation_Result NVARCHAR(100) NULL,
    Status NVARCHAR(20) NOT NULL,
    ApprovedByAdmin NVARCHAR(100) NULL,
    ApprovedByAdminDate DATETIME NULL,
    ApprovedByOfficer NVARCHAR(100) NULL,
    ApprovedByOfficerDate DATETIME NULL,
    ApprovedByManager NVARCHAR(100) NULL,
    ApprovedByManagerDate DATETIME NULL,
    UserID NVARCHAR(100) NULL,
    Delegated_To NVARCHAR(100) NULL,
    Process_Date DATETIME NULL,
    Update_Date DATETIME NULL,
    Flag_Update CHAR(1) NOT NULL,
    Change_Date DATETIME NOT NULL CONSTRAINT DF_DissolutionWorkbookHist_ChangeDate DEFAULT (GETDATE())
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist')
      AND name = 'Evaluation_Result'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
    ADD Evaluation_Result NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist')
      AND name = 'ApprovedByAdmin'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
    ADD
      ApprovedByAdmin NVARCHAR(100) NULL,
      ApprovedByAdminDate DATETIME NULL,
      ApprovedByOfficer NVARCHAR(100) NULL,
      ApprovedByOfficerDate DATETIME NULL,
      ApprovedByManager NVARCHAR(100) NULL,
      ApprovedByManagerDate DATETIME NULL
  END
END
GO

IF OBJECT_ID('dbo.TR_T_Kalibrasi_DissolutionTester_Workbook_Session_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
END
GO

CREATE TRIGGER dbo.TR_T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
ON dbo.T_Kalibrasi_DissolutionTester_Workbook_Session
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON

  INSERT INTO dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
  (
    Session_ID,
    QA_ID,
    ID_No_Sertifikat,
    Workbook_Payload_JSON,
    Calculation_Result_JSON,
    Evaluation_Result,
    Status,
    ApprovedByAdmin,
    ApprovedByAdminDate,
    ApprovedByOfficer,
    ApprovedByOfficerDate,
    ApprovedByManager,
    ApprovedByManagerDate,
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
    i.Workbook_Payload_JSON,
    i.Calculation_Result_JSON,
    i.Evaluation_Result,
    i.Status,
    i.ApprovedByAdmin,
    i.ApprovedByAdminDate,
    i.ApprovedByOfficer,
    i.ApprovedByOfficerDate,
    i.ApprovedByManager,
    i.ApprovedByManagerDate,
    i.UserID,
    i.Delegated_To,
    i.Process_Date,
    i.Update_Date,
    CASE WHEN d.Session_ID IS NULL THEN 'I' ELSE 'U' END
  FROM inserted AS i
  LEFT JOIN deleted AS d ON d.Session_ID = i.Session_ID

  INSERT INTO dbo.T_Kalibrasi_DissolutionTester_Workbook_Session_Hist
  (
    Session_ID,
    QA_ID,
    ID_No_Sertifikat,
    Workbook_Payload_JSON,
    Calculation_Result_JSON,
    Evaluation_Result,
    Status,
    ApprovedByAdmin,
    ApprovedByAdminDate,
    ApprovedByOfficer,
    ApprovedByOfficerDate,
    ApprovedByManager,
    ApprovedByManagerDate,
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
    d.Workbook_Payload_JSON,
    d.Calculation_Result_JSON,
    d.Evaluation_Result,
    d.Status,
    d.ApprovedByAdmin,
    d.ApprovedByAdminDate,
    d.ApprovedByOfficer,
    d.ApprovedByOfficerDate,
    d.ApprovedByManager,
    d.ApprovedByManagerDate,
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
