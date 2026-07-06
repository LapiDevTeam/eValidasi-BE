IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_Header_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_Header_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Header_Hist_Action_At DEFAULT (SYSDATETIME()),
    Schedule_Header_ID INT NOT NULL,
    Period_Year NVARCHAR(50) NOT NULL,
    Period_Month NVARCHAR(50) NOT NULL,
    Workflow_View VARCHAR(20) NOT NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL,
    Is_Locked BIT NOT NULL,
    Period_Start DATE NOT NULL,
    Period_End DATE NOT NULL,
    Buffer_Start DATE NOT NULL,
    Buffer_End DATE NOT NULL,
    Requested_By NVARCHAR(50) NULL,
    Requested_Date DATETIME2(0) NULL,
    Prepared_By NVARCHAR(50) NULL,
    Prepared_By_Name NVARCHAR(255) NULL,
    Prepared_By_Title NVARCHAR(255) NULL,
    Prepared_Date DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_By_Name NVARCHAR(255) NULL,
    Approved_By_Title NVARCHAR(255) NULL,
    Approved_Date DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_Date DATETIME2(0) NULL,
    Remarks NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL,
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Workflow_View') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist
    ADD Workflow_View VARCHAR(20) NOT NULL
      CONSTRAINT DF_T_Monthly_Schedule_Header_Hist_Workflow_View DEFAULT ('plan');
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Prepared_By') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Prepared_By NVARCHAR(50) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Prepared_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Prepared_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Prepared_By_Title') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Prepared_By_Title NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Prepared_Date') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Prepared_Date DATETIME2(0) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Approved_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Approved_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header_Hist', 'Approved_By_Title') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header_Hist ADD Approved_By_Title NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_External_Header_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_External_Header_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Header_Hist_Action_At DEFAULT (SYSDATETIME()),
    Schedule_External_Header_ID INT NOT NULL,
    Base_Period_Year NVARCHAR(50) NOT NULL,
    Base_Period_Month NVARCHAR(50) NOT NULL,
    Workflow_View VARCHAR(20) NOT NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL,
    Is_Locked BIT NOT NULL,
    Requested_By NVARCHAR(50) NULL,
    Requested_Date DATETIME2(0) NULL,
    Prepared_By NVARCHAR(50) NULL,
    Prepared_By_Name NVARCHAR(255) NULL,
    Prepared_By_Title NVARCHAR(255) NULL,
    Prepared_Date DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_By_Name NVARCHAR(255) NULL,
    Approved_By_Title NVARCHAR(255) NULL,
    Approved_Date DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_Date DATETIME2(0) NULL,
    Remarks NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL,
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Workflow_View') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist
    ADD Workflow_View VARCHAR(20) NOT NULL
      CONSTRAINT DF_T_Monthly_Schedule_External_Header_Hist_Workflow_View DEFAULT ('plan');
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Prepared_By') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Prepared_By NVARCHAR(50) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Prepared_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Prepared_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Prepared_By_Title') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Prepared_By_Title NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Prepared_Date') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Prepared_Date DATETIME2(0) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Approved_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Approved_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header_Hist', 'Approved_By_Title') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header_Hist ADD Approved_By_Title NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_External_Detail_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_External_Detail_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Detail_Hist_Action_At DEFAULT (SYSDATETIME()),
    Schedule_External_Detail_ID INT NOT NULL,
    Schedule_External_Header_ID INT NOT NULL,
    Line_No INT NOT NULL,
    Schedule_Period_Year NVARCHAR(50) NOT NULL,
    Schedule_Period_Month NVARCHAR(50) NOT NULL,
    QA_ID NVARCHAR(100) NULL,
    Instrument_Name NVARCHAR(255) NULL,
    Instrument_ID NVARCHAR(100) NULL,
    Department NVARCHAR(100) NULL,
    [Location] NVARCHAR(255) NULL,
    Due_Date DATE NULL,
    Calibration_Date DATE NULL,
    Insitu_Date DATE NULL,
    User_Equipment_Handover_Date DATE NULL,
    Equipment_Return_By_Vendor_Date DATE NULL,
    Realization_Date DATE NULL,
    Remarks NVARCHAR(500) NULL,
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL,
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_External_Header_Hist_Action'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_External_Header_Hist_Action
    ON dbo.T_Monthly_Schedule_External_Header_Hist (Schedule_External_Header_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_External_Detail_Hist_Action'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail_Hist')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_External_Detail_Hist_Action
    ON dbo.T_Monthly_Schedule_External_Detail_Hist (Schedule_External_Header_ID, Schedule_External_Detail_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_External_Header_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_External_Header_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_Monthly_Schedule_External_Header_Hist
ON dbo.T_Monthly_Schedule_External_Header
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Header_Hist
    (
      Action_Type, Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'UPDATE', Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Header_Hist
    (
      Action_Type, Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'INSERT', Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Header_Hist
    (
      Action_Type, Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'DELETE', Schedule_External_Header_ID, Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No,
      [Status], Is_Locked, Requested_By, Requested_Date, Prepared_By, Prepared_By_Name, Prepared_By_Title, Prepared_Date,
      Approved_By, Approved_By_Name, Approved_By_Title, Approved_Date,
      Rejected_By, Rejected_Date, Remarks, Created_By, Created_Date, Updated_By, Updated_Date
    FROM deleted;
  END;
END;
GO

IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_External_Detail_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_External_Detail_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_Monthly_Schedule_External_Detail_Hist
ON dbo.T_Monthly_Schedule_External_Detail
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Detail_Hist
    (
      Action_Type, Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'UPDATE', Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Detail_Hist
    (
      Action_Type, Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'INSERT', Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_External_Detail_Hist
    (
      Action_Type, Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    )
    SELECT
      'DELETE', Schedule_External_Detail_ID, Schedule_External_Header_ID, Line_No,
      Schedule_Period_Year, Schedule_Period_Month, QA_ID, Instrument_Name, Instrument_ID,
      Department, [Location], Due_Date, Calibration_Date, Insitu_Date,
      User_Equipment_Handover_Date, Equipment_Return_By_Vendor_Date, Realization_Date,
      Remarks, Source_Table, Source_Key, Created_By, Created_Date, Updated_By, Updated_Date
    FROM deleted;
  END;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Detail_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_Detail_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_Detail_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Detail_Hist_Action_At DEFAULT (SYSDATETIME()),
    Schedule_Detail_ID INT NOT NULL,
    Schedule_Header_ID INT NOT NULL,
    Line_No INT NOT NULL,
    QA_ID NVARCHAR(100) NULL,
    Instrument_Name NVARCHAR(255) NULL,
    Instrument_ID NVARCHAR(100) NULL,
    Department NVARCHAR(100) NULL,
    [Location] NVARCHAR(255) NULL,
    Due_Date DATE NULL,
    Tgl_Kalibrasi DATE NULL,
    Source_Date DATE NULL,
    Source_Match_Type VARCHAR(30) NULL,
    PIC NVARCHAR(100) NULL,
    Checklist_S BIT NOT NULL,
    Checklist_D BIT NOT NULL,
    Checklist_M BIT NOT NULL,
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL,
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Header_Hist_Action'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header_Hist')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Header_Hist_Action
    ON dbo.T_Monthly_Schedule_Header_Hist (Schedule_Header_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Detail_Hist_Action'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Detail_Hist')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Detail_Hist_Action
    ON dbo.T_Monthly_Schedule_Detail_Hist (Schedule_Header_ID, Schedule_Detail_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_Header_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_Header_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_Monthly_Schedule_Header_Hist
ON dbo.T_Monthly_Schedule_Header
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Header_Hist
    (
      Action_Type,
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'UPDATE',
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Header_Hist
    (
      Action_Type,
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'INSERT',
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Header_Hist
    (
      Action_Type,
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'DELETE',
      Schedule_Header_ID,
      Period_Year,
      Period_Month,
      Workflow_View,
      Revision_No,
      [Status],
      Is_Locked,
      Period_Start,
      Period_End,
      Buffer_Start,
      Buffer_End,
      Requested_By,
      Requested_Date,
      Prepared_By,
      Prepared_By_Name,
      Prepared_By_Title,
      Prepared_Date,
      Approved_By,
      Approved_By_Name,
      Approved_By_Title,
      Approved_Date,
      Rejected_By,
      Rejected_Date,
      Remarks,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM deleted;
  END;
END;
GO

IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_Detail_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_Detail_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_Monthly_Schedule_Detail_Hist
ON dbo.T_Monthly_Schedule_Detail
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Detail_Hist
    (
      Action_Type,
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'UPDATE',
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Detail_Hist
    (
      Action_Type,
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'INSERT',
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_Monthly_Schedule_Detail_Hist
    (
      Action_Type,
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    )
    SELECT
      'DELETE',
      Schedule_Detail_ID,
      Schedule_Header_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Source_Date,
      Source_Match_Type,
      PIC,
      Checklist_S,
      Checklist_D,
      Checklist_M,
      Source_Table,
      Source_Key,
      Created_By,
      Created_Date,
      Updated_By,
      Updated_Date
    FROM deleted;
  END;
END;
GO
