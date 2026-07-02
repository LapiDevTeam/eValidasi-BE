IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.T_AWP_Header_Hist
  (
    Hist_ID BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_T_AWP_Header_Hist PRIMARY KEY,
    Action_Type VARCHAR(10) NOT NULL,
    Action_At DATETIME2(0) NOT NULL CONSTRAINT DF_T_AWP_Header_Hist_Action_At DEFAULT (SYSDATETIME()),
    AWP_ID INT NOT NULL,
    [Year] NVARCHAR(50) NOT NULL,
    Workflow_View VARCHAR(10) NULL,
    Revision_No INT NOT NULL,
    [Status] VARCHAR(20) NOT NULL,
    Requested_By NVARCHAR(50) NULL,
    Prepared_By NVARCHAR(50) NULL,
    Prepared_By_Name NVARCHAR(255) NULL,
    Requested_At DATETIME2(0) NULL,
    Approved_By NVARCHAR(50) NULL,
    Approved_By_Name NVARCHAR(255) NULL,
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
    Initial_Due_Date DATE NULL,
    Tgl_Kalibrasi DATE NULL,
    Parameter_Interval INT NULL,
    Plan_Month TINYINT NULL,
    Real_Month TINYINT NULL,
    Plan_Date DATE NULL,
    Real_Date DATE NULL,
    Plan_Dates_JSON NVARCHAR(MAX) NULL,
    Real_Dates_JSON NVARCHAR(MAX) NULL,
    OOC_Dates_JSON NVARCHAR(MAX) NULL,
    Plan_Months_JSON NVARCHAR(MAX) NULL,
    Real_Months_JSON NVARCHAR(MAX) NULL,
    Revision_Status VARCHAR(20) NULL,
    Source_Table NVARCHAR(128) NULL,
    Source_Key NVARCHAR(100) NULL
  );
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Realization_History_DA_Thermohygro', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Realization_History_DA_Thermohygro;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Realization_History_DA_Thermohygro
ON dbo.T_Kalibrasi_DA_Thermohygro
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('dbo.T_AWP_Realization_History', 'U') IS NULL
    RETURN;

  INSERT INTO dbo.T_AWP_Realization_History
    (QA_ID, Instrument_ID, Real_Date, Source_Table, Source_Key)
  SELECT DISTINCT
    I.QA_ID,
    I.Assm_No_identitas_Istrumen,
    CONVERT(DATE, I.Tgl_kalibrasi),
    CAST('T_Kalibrasi_DA_Thermohygro' AS NVARCHAR(128)),
    CAST(I.QA_ID AS NVARCHAR(100))
  FROM inserted AS I
  WHERE I.QA_ID IS NOT NULL
    AND I.Tgl_kalibrasi IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.T_AWP_Realization_History AS H
      WHERE H.Source_Table = 'T_Kalibrasi_DA_Thermohygro'
        AND H.QA_ID = I.QA_ID
        AND H.Real_Date = CONVERT(DATE, I.Tgl_kalibrasi)
    );
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Realization_History_DA_Anak_Timbangan', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Realization_History_DA_Anak_Timbangan;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Realization_History_DA_Anak_Timbangan
ON dbo.T_Kalibrasi_DA_Anak_Timbangan
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('dbo.T_AWP_Realization_History', 'U') IS NULL
    RETURN;

  INSERT INTO dbo.T_AWP_Realization_History
    (QA_ID, Instrument_ID, Real_Date, Source_Table, Source_Key)
  SELECT DISTINCT
    I.QA_ID,
    I.Assm_No_identitas_Istrumen,
    CONVERT(DATE, I.Tgl_kalibrasi),
    CAST('T_Kalibrasi_DA_Anak_Timbangan' AS NVARCHAR(128)),
    CAST(I.QA_ID AS NVARCHAR(100))
  FROM inserted AS I
  WHERE I.QA_ID IS NOT NULL
    AND I.Tgl_kalibrasi IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.T_AWP_Realization_History AS H
      WHERE H.Source_Table = 'T_Kalibrasi_DA_Anak_Timbangan'
        AND H.QA_ID = I.QA_ID
        AND H.Real_Date = CONVERT(DATE, I.Tgl_kalibrasi)
    );
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Realization_History_DA_Timbangan', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Realization_History_DA_Timbangan;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Realization_History_DA_Timbangan
ON dbo.T_Kalibrasi_DA_Timbangan
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('dbo.T_AWP_Realization_History', 'U') IS NULL
    RETURN;

  INSERT INTO dbo.T_AWP_Realization_History
    (QA_ID, Instrument_ID, Real_Date, Source_Table, Source_Key)
  SELECT DISTINCT
    I.QA_ID,
    I.Assm_No_identitas_Istrumen,
    CONVERT(DATE, I.Tgl_kalibrasi),
    CAST('T_Kalibrasi_DA_Timbangan' AS NVARCHAR(128)),
    CAST(I.QA_ID AS NVARCHAR(100))
  FROM inserted AS I
  WHERE I.QA_ID IS NOT NULL
    AND I.Tgl_kalibrasi IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.T_AWP_Realization_History AS H
      WHERE H.Source_Table = 'T_Kalibrasi_DA_Timbangan'
        AND H.QA_ID = I.QA_ID
        AND H.Real_Date = CONVERT(DATE, I.Tgl_kalibrasi)
    );
END;
GO

IF OBJECT_ID('dbo.TR_T_AWP_Realization_History_DA_Bagian', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_AWP_Realization_History_DA_Bagian;
END;
GO

CREATE TRIGGER dbo.TR_T_AWP_Realization_History_DA_Bagian
ON dbo.T_Kalibrasi_DA_Bagian
AFTER INSERT, UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  IF OBJECT_ID('dbo.T_AWP_Realization_History', 'U') IS NULL
    RETURN;

  INSERT INTO dbo.T_AWP_Realization_History
    (QA_ID, Instrument_ID, Real_Date, Source_Table, Source_Key)
  SELECT DISTINCT
    I.QA_ID,
    I.Assm_No_identitas_Istrumen,
    CONVERT(DATE, I.Tgl_kalibrasi),
    CAST('T_Kalibrasi_DA_Bagian' AS NVARCHAR(128)),
    CAST(I.QA_ID AS NVARCHAR(100))
  FROM inserted AS I
  WHERE I.QA_ID IS NOT NULL
    AND I.Tgl_kalibrasi IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.T_AWP_Realization_History AS H
      WHERE H.Source_Table = 'T_Kalibrasi_DA_Bagian'
        AND H.QA_ID = I.QA_ID
        AND H.Real_Date = CONVERT(DATE, I.Tgl_kalibrasi)
    );
END;
GO

IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Header_Hist', 'Prepared_By') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Header_Hist ADD Prepared_By NVARCHAR(50) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Header_Hist', 'Workflow_View') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Header_Hist ADD Workflow_View VARCHAR(10) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Header_Hist', 'Prepared_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Header_Hist ADD Prepared_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Header_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Header_Hist', 'Approved_By_Name') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Header_Hist ADD Approved_By_Name NVARCHAR(255) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Initial_Due_Date') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Initial_Due_Date DATE NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Plan_Dates_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Plan_Dates_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Real_Dates_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Real_Dates_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'OOC_Dates_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD OOC_Dates_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Plan_Months_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Plan_Months_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Real_Months_JSON') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Real_Months_JSON NVARCHAR(MAX) NULL;
END;
GO

IF OBJECT_ID('dbo.T_AWP_Detail_Hist', 'U') IS NOT NULL AND COL_LENGTH('dbo.T_AWP_Detail_Hist', 'Revision_Status') IS NULL
BEGIN
  ALTER TABLE dbo.T_AWP_Detail_Hist ADD Revision_Status VARCHAR(20) NULL;
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Workflow_View,
      Revision_No,
      [Status],
      Requested_By,
      Prepared_By,
      Prepared_By_Name,
      Requested_At,
      Approved_By,
      Approved_By_Name,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
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
      Initial_Due_Date,
      Tgl_Kalibrasi,
      Parameter_Interval,
      Plan_Month,
      Real_Month,
      Plan_Date,
      Real_Date,
      Plan_Dates_JSON,
      Real_Dates_JSON,
      OOC_Dates_JSON,
      Plan_Months_JSON,
      Real_Months_JSON,
      Revision_Status,
      Source_Table,
      Source_Key
    FROM deleted;
  END;
END;
GO
