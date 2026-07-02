IF OBJECT_ID('dbo.T_Monthly_Schedule_Header', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_Header
  (
    Schedule_Header_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_Header PRIMARY KEY,
    Period_Year NVARCHAR(50) NOT NULL,
    Period_Month NVARCHAR(50) NOT NULL,
    Workflow_View VARCHAR(20) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_Header_Workflow_View DEFAULT ('plan'),
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
    CONSTRAINT CK_T_Monthly_Schedule_Header_Status CHECK ([Status] IN ('REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    CONSTRAINT CK_T_Monthly_Schedule_Header_Workflow_View CHECK (Workflow_View IN ('plan', 'realization')),
    CONSTRAINT CK_T_Monthly_Schedule_Header_Period_Month CHECK (
      Period_Month IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12')
    )
  );
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_Header', 'Workflow_View') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header
    ADD Workflow_View VARCHAR(20) NOT NULL
      CONSTRAINT DF_T_Monthly_Schedule_Header_Workflow_View DEFAULT ('plan');
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header', 'U') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_T_Monthly_Schedule_Header_Period_Revision'
      AND parent_object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header')
  )
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header
    DROP CONSTRAINT UQ_T_Monthly_Schedule_Header_Period_Revision;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_Header', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_T_Monthly_Schedule_Header_Workflow_View'
      AND parent_object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header')
  )
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_Header
    ADD CONSTRAINT CK_T_Monthly_Schedule_Header_Workflow_View
      CHECK (Workflow_View IN ('plan', 'realization'));
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_External_Header
  (
    Schedule_External_Header_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_External_Header PRIMARY KEY,
    Base_Period_Year NVARCHAR(50) NOT NULL,
    Base_Period_Month NVARCHAR(50) NOT NULL,
    Workflow_View VARCHAR(20) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Header_Workflow_View DEFAULT ('plan'),
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Header_Status DEFAULT ('REQUESTED'),
    Is_Locked BIT NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Header_Is_Locked DEFAULT (0),
    Requested_By NVARCHAR(50) NULL,
    Requested_Date DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_Date DATETIME2(0) NULL,
    Rejected_By NVARCHAR(50) NULL,
    Rejected_Date DATETIME2(0) NULL,
    Remarks NVARCHAR(MAX) NULL,
    Created_By NVARCHAR(50) NULL,
    Created_Date DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Header_Created_Date DEFAULT (SYSDATETIME()),
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL,
    CONSTRAINT CK_T_Monthly_Schedule_External_Header_Status CHECK ([Status] IN ('REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    CONSTRAINT CK_T_Monthly_Schedule_External_Header_Workflow_View CHECK (Workflow_View IN ('plan', 'realization')),
    CONSTRAINT CK_T_Monthly_Schedule_External_Header_Period_Month CHECK (
      Base_Period_Month IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12')
    )
  );
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.T_Monthly_Schedule_External_Header', 'Workflow_View') IS NULL
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header
    ADD Workflow_View VARCHAR(20) NOT NULL
      CONSTRAINT DF_T_Monthly_Schedule_External_Header_Workflow_View DEFAULT ('plan');
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header', 'U') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = 'UQ_T_Monthly_Schedule_External_Header_Period_Revision'
      AND parent_object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
  )
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header
    DROP CONSTRAINT UQ_T_Monthly_Schedule_External_Header_Period_Revision;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_T_Monthly_Schedule_External_Header_Workflow_View'
      AND parent_object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
  )
BEGIN
  ALTER TABLE dbo.T_Monthly_Schedule_External_Header
    ADD CONSTRAINT CK_T_Monthly_Schedule_External_Header_Workflow_View
      CHECK (Workflow_View IN ('plan', 'realization'));
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_Monthly_Schedule_External_Detail
  (
    Schedule_External_Detail_ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_Monthly_Schedule_External_Detail PRIMARY KEY,
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
    Created_Date DATETIME2(0) NOT NULL CONSTRAINT DF_T_Monthly_Schedule_External_Detail_Created_Date DEFAULT (SYSDATETIME()),
    Updated_By NVARCHAR(50) NULL,
    Updated_Date DATETIME2(0) NULL,
    CONSTRAINT FK_T_Monthly_Schedule_External_Detail_Header
      FOREIGN KEY (Schedule_External_Header_ID)
      REFERENCES dbo.T_Monthly_Schedule_External_Header (Schedule_External_Header_ID)
      ON DELETE CASCADE,
    CONSTRAINT CK_T_Monthly_Schedule_External_Detail_Period_Month CHECK (
      Schedule_Period_Month IN ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12')
    )
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
  WHERE name = 'IX_T_Monthly_Schedule_External_Header_Period_Status'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_External_Header_Period_Status
    ON dbo.T_Monthly_Schedule_External_Header (Base_Period_Year, Base_Period_Month, [Status], Revision_No DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_External_Detail_Header_Line'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_External_Detail_Header_Line
    ON dbo.T_Monthly_Schedule_External_Detail (Schedule_External_Header_ID, Schedule_Period_Year, Schedule_Period_Month, Line_No);
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
  WHERE name = 'UX_T_Monthly_Schedule_External_Header_Period_View_Revision'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
)
BEGIN
  CREATE UNIQUE INDEX UX_T_Monthly_Schedule_External_Header_Period_View_Revision
    ON dbo.T_Monthly_Schedule_External_Header (Base_Period_Year, Base_Period_Month, Workflow_View, Revision_No);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_External_Header_Period_View_Status'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_External_Header_Period_View_Status
    ON dbo.T_Monthly_Schedule_External_Header (Base_Period_Year, Base_Period_Month, Workflow_View, [Status], Revision_No DESC);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_T_Monthly_Schedule_Header_Period_View_Revision'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header')
)
BEGIN
  CREATE UNIQUE INDEX UX_T_Monthly_Schedule_Header_Period_View_Revision
    ON dbo.T_Monthly_Schedule_Header (Period_Year, Period_Month, Workflow_View, Revision_No);
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_T_Monthly_Schedule_Header_Period_View_Status'
    AND object_id = OBJECT_ID('dbo.T_Monthly_Schedule_Header')
)
BEGIN
  CREATE INDEX IX_T_Monthly_Schedule_Header_Period_View_Status
    ON dbo.T_Monthly_Schedule_Header (Period_Year, Period_Month, Workflow_View, [Status], Revision_No DESC);
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
