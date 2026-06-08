IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_AWP_Header_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_AWP_Header_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_AWP_Header_Hist_Action_At DEFAULT (SYSDATETIME()),
    AWP_ID INT NOT NULL,
    [Year] NVARCHAR(50) NOT NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL,
    Requested_By NVARCHAR(50) NULL,
    Requested_At DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_At DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_At DATETIME2(0) NULL,
    Notes NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_At DATETIME2(0) NOT NULL,
    Updated_By NVARCHAR(50) NULL,
    Updated_At DATETIME2(0) NULL
  );
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_AWP_Detail_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_AWP_Detail_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_AWP_Detail_Hist_Action_At DEFAULT (SYSDATETIME()),
    AWP_Detail_ID INT NOT NULL,
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
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_AWP_Header_Hist_AWP_Action'
    AND object_id = OBJECT_ID('dbo.T_AWP_Header_Hist')
)
BEGIN
  CREATE INDEX IX_T_AWP_Header_Hist_AWP_Action
    ON dbo.T_AWP_Header_Hist (AWP_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_AWP_Detail_Hist_AWP_Action'
    AND object_id = OBJECT_ID('dbo.T_AWP_Detail_Hist')
)
BEGIN
  CREATE INDEX IX_T_AWP_Detail_Hist_AWP_Action
    ON dbo.T_AWP_Detail_Hist (AWP_ID, AWP_Detail_ID, Action_At DESC, Hist_ID DESC);
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Header_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Header_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Header_Hist
ON dbo.T_AWP_Header
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_AWP_Header_Hist
    (
      Action_Type,
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    )
    SELECT
      'UPDATE',
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_AWP_Header_Hist
    (
      Action_Type,
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    )
    SELECT
      'INSERT',
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_AWP_Header_Hist
    (
      Action_Type,
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    )
    SELECT
      'DELETE',
      AWP_ID,
      [Year],
      Revision_No,
      [Status],
      Requested_By,
      Requested_At,
      Approved_By,
      Approved_At,
      Rejected_By,
      Rejected_At,
      Notes,
      Created_By,
      Created_At,
      Updated_By,
      Updated_At
    FROM deleted;
  END;
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Detail_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Detail_Hist;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Detail_Hist
ON dbo.T_AWP_Detail
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_AWP_Detail_Hist
    (
      Action_Type,
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    )
    SELECT
      'UPDATE',
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM inserted)
  BEGIN
    INSERT INTO dbo.T_AWP_Detail_Hist
    (
      Action_Type,
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    )
    SELECT
      'INSERT',
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    FROM inserted;
  END
  ELSE IF EXISTS (SELECT 1 FROM deleted)
  BEGIN
    INSERT INTO dbo.T_AWP_Detail_Hist
    (
      Action_Type,
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    )
    SELECT
      'DELETE',
      AWP_Detail_ID,
      AWP_ID,
      Line_No,
      QA_ID,
      Instrument_Name,
      Instrument_ID,
      Department,
      [Location],
      Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Source_Table,
      Source_Key
    FROM deleted;
  END;
END;
GO
