IF OBJECT_ID('dbo.T_Monthly_Schedule_Header', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_Header
  (
    Schedule_Header_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_Header PRIMARY KEY,
    Period_Year NVARCHAR(50) NOT NULL,
    Period_Month NVARCHAR(50) NOT NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Header_Status DEFAULT ('REQUESTED'),
    Is_Locked BIT NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Header_Is_Locked DEFAULT (0),
    Period_Start DATE NOT NULL,
    Period_End DATE NOT NULL,
    Buffer_Start DATE NOT NULL,
    Buffer_End DATE NOT NULL,
    Requested_By NVARCHAR(50) NULL,
    Requested_Date DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_Date DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_Date DATETIME2(0) NULL,
    Remarks NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Header_Created_Date DEFAULT (SYSDATETIME()),
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL,
    CONSTRAINT UQ_T_Monthly_Schedule_Header_Period_Revision UNIQUE (Period_Year, Period_Month, Revision_No),
    CONSTRAINT CK_T_Monthly_Schedule_Header_Status CHECK ([Status] IN ('REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    CONSTRAINT CK_T_Monthly_Schedule_Header_Period_Month CHECK (Period_Month BETWEEN 1 AND 12)
  );
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Detail', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_Detail
  (
    Schedule_Detail_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_Detail PRIMARY KEY,
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
    Checklist_S BIT NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Detail_Checklist_S DEFAULT (0),
    Checklist_D BIT NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Detail_Checklist_D DEFAULT (0),
    Checklist_M BIT NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Detail_Checklist_M DEFAULT (0),
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Detail_Created_Date DEFAULT (SYSDATETIME()),
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL,
    CONSTRAINT FK_T_Monthly_Schedule_Detail_Header
      FOREIGN KEY (Schedule_Header_ID)
      REFERENCES dbo.T_Monthly_Schedule_Header (Schedule_Header_ID)
      ON DELETE CASCADE,
    CONSTRAINT CK_T_Monthly_Schedule_Detail_Source_Match_Type
      CHECK (Source_Match_Type IS NULL OR Source_Match_Type IN ('NONE', 'DUE_DATE', 'CALIBRATION_DATE', 'BOTH'))
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Header_Period_Status'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Header_Period_Status
    ON dbo.T_Monthly_Schedule_Header (Period_Year, Period_Month, [Status], Revision_No DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Detail_Header_Line'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Detail')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Detail_Header_Line
    ON dbo.T_Monthly_Schedule_Detail (Schedule_Header_ID, Line_No);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Detail_Source'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Detail')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Detail_Source
    ON dbo.T_Monthly_Schedule_Detail (Schedule_Header_ID, Source_Key, Instrument_ID);
END;
GO
