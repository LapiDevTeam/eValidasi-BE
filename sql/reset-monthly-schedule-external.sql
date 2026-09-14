IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_External_Detail_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_External_Detail_Hist;
END;
GO

IF OBJECT_ID('dbo.TR_T_Monthly_Schedule_External_Header_Hist', 'TR') IS NOT NULL
BEGIN
  DROP TRIGGER dbo.TR_T_Monthly_Schedule_External_Header_Hist;
END;
GO

-- Drop any foreign keys from other tables that reference the external monthly schedule tables.
-- This is useful for a full reset, but dependent modules may need their constraints recreated later.
DECLARE @DropFkSql NVARCHAR(MAX);

DECLARE fk_cursor CURSOR FAST_FORWARD FOR
SELECT
  N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
  + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk
WHERE fk.referenced_object_id IN (
  OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail'),
  OBJECT_ID('dbo.T_Monthly_Schedule_External_Header')
);

OPEN fk_cursor;
FETCH NEXT FROM fk_cursor INTO @DropFkSql;

WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT @DropFkSql;
  EXEC sp_executesql @DropFkSql;
  FETCH NEXT FROM fk_cursor INTO @DropFkSql;
END;

CLOSE fk_cursor;
DEALLOCATE fk_cursor;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.T_Monthly_Schedule_External_Detail;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.T_Monthly_Schedule_External_Header;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Detail_Hist', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.T_Monthly_Schedule_External_Detail_Hist;
END;
GO

IF OBJECT_ID('dbo.T_Monthly_Schedule_External_Header_Hist', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.T_Monthly_Schedule_External_Header_Hist;
END;
GO
