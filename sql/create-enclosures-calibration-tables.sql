IF OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
  (
    Session_ID BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    QA_ID NVARCHAR(50) NULL,
    ID_No_Sertifikat NVARCHAR(50) NULL,
    Workbook_Payload_JSON NVARCHAR(MAX) NULL,
    Calculation_Result_JSON NVARCHAR(MAX) NULL,
    Evaluation_Result NVARCHAR(100) NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_EnclosuresWorkbook_Status DEFAULT (N'DRAFT'),
    ApprovedByAdmin NVARCHAR(100) NULL,
    ApprovedByAdminDate DATETIME NULL,
    ApprovedByOfficer NVARCHAR(100) NULL,
    ApprovedByOfficerDate DATETIME NULL,
    ApprovedByManager NVARCHAR(100) NULL,
    ApprovedByManagerDate DATETIME NULL,
    UserID NVARCHAR(100) NULL,
    Delegated_To NVARCHAR(100) NULL,
    Process_Date DATETIME NOT NULL CONSTRAINT DF_EnclosuresWorkbook_ProcessDate DEFAULT (GETDATE()),
    Update_Date DATETIME NULL
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'QA_ID'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD QA_ID NVARCHAR(50) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ID_No_Sertifikat'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ID_No_Sertifikat NVARCHAR(50) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Workbook_Payload_JSON'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Workbook_Payload_JSON NVARCHAR(MAX) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Calculation_Result_JSON'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Calculation_Result_JSON NVARCHAR(MAX) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Evaluation_Result'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Evaluation_Result NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Status'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Status NVARCHAR(20) NULL

    EXEC(N'UPDATE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    SET Status = N''DRAFT''
    WHERE Status IS NULL')

    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ALTER COLUMN Status NVARCHAR(20) NOT NULL')
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
      ON c.object_id = dc.parent_object_id
     AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND c.name = 'Status'
  )
  BEGIN
    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD CONSTRAINT DF_EnclosuresWorkbook_Status DEFAULT (N''DRAFT'') FOR Status')
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByAdmin'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByAdmin NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByAdminDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByAdminDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByOfficer'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByOfficer NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByOfficerDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByOfficerDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByManager'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByManager NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'ApprovedByManagerDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD ApprovedByManagerDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'UserID'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD UserID NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Delegated_To'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Delegated_To NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Process_Date'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Process_Date DATETIME NULL

    EXEC(N'UPDATE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    SET Process_Date = GETDATE()
    WHERE Process_Date IS NULL')

    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ALTER COLUMN Process_Date DATETIME NOT NULL')
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
      ON c.object_id = dc.parent_object_id
     AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND c.name = 'Process_Date'
  )
  BEGIN
    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD CONSTRAINT DF_EnclosuresWorkbook_ProcessDate DEFAULT (GETDATE()) FOR Process_Date')
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
      AND name = 'Update_Date'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session
    ADD Update_Date DATETIME NULL
  END
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_EnclosuresWorkbook_QA_Sertifikat'
    AND object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session')
)
BEGIN
  CREATE INDEX IX_EnclosuresWorkbook_QA_Sertifikat
  ON dbo.T_Kalibrasi_Enclosures_Workbook_Session
  (
    QA_ID,
    ID_No_Sertifikat,
    Session_ID DESC
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
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
    Change_Date DATETIME NOT NULL CONSTRAINT DF_EnclosuresWorkbookHist_ChangeDate DEFAULT (GETDATE())
  )
END
GO

IF OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Session_ID'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Session_ID BIGINT NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'QA_ID'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD QA_ID NVARCHAR(50) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ID_No_Sertifikat'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ID_No_Sertifikat NVARCHAR(50) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Workbook_Payload_JSON'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Workbook_Payload_JSON NVARCHAR(MAX) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Calculation_Result_JSON'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Calculation_Result_JSON NVARCHAR(MAX) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Evaluation_Result'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Evaluation_Result NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Status'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Status NVARCHAR(20) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByAdmin'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByAdmin NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByAdminDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByAdminDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByOfficer'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByOfficer NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByOfficerDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByOfficerDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByManager'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByManager NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'ApprovedByManagerDate'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD ApprovedByManagerDate DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'UserID'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD UserID NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Delegated_To'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Delegated_To NVARCHAR(100) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Process_Date'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Process_Date DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Update_Date'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Update_Date DATETIME NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Flag_Update'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Flag_Update CHAR(1) NULL
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND name = 'Change_Date'
  )
  BEGIN
    ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD Change_Date DATETIME NULL

    EXEC(N'UPDATE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    SET Change_Date = GETDATE()
    WHERE Change_Date IS NULL')

    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ALTER COLUMN Change_Date DATETIME NOT NULL')
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
      ON c.object_id = dc.parent_object_id
     AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist')
      AND c.name = 'Change_Date'
  )
  BEGIN
    EXEC(N'ALTER TABLE dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
    ADD CONSTRAINT DF_EnclosuresWorkbookHist_ChangeDate DEFAULT (GETDATE()) FOR Change_Date')
  END
END
GO

IF OBJECT_ID('dbo.TR_T_Kalibrasi_Enclosures_Workbook_Session_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Kalibrasi_Enclosures_Workbook_Session_Hist
END
GO

CREATE TRIGGER dbo.TR_T_Kalibrasi_Enclosures_Workbook_Session_Hist
ON dbo.T_Kalibrasi_Enclosures_Workbook_Session
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON

  INSERT INTO dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
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

  INSERT INTO dbo.T_Kalibrasi_Enclosures_Workbook_Session_Hist
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



