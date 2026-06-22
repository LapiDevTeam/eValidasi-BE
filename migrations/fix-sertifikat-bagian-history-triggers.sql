/*
Fix history triggers for T_Kalibrasi_Sertifikat_Bagian so they remain valid
when T_Kalibrasi_Sertifikat_Bagian_Hist has extra columns
(reject_remark, deleteStatus, deleteDate).
*/

IF OBJECT_ID(N'dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_INSERT', N'TR') IS NOT NULL
  DROP TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_INSERT;
GO

CREATE TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_INSERT
ON dbo.T_Kalibrasi_Sertifikat_Bagian
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.T_Kalibrasi_Sertifikat_Bagian_Hist
  (
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    reject_remark,
    deleteStatus,
    deleteDate
  )
  SELECT
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    NULL,
    'INSERT',
    GETDATE()
  FROM inserted;
END;
GO

IF OBJECT_ID(N'dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_UPDATE', N'TR') IS NOT NULL
  DROP TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_UPDATE;
GO

CREATE TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_UPDATE
ON dbo.T_Kalibrasi_Sertifikat_Bagian
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.T_Kalibrasi_Sertifikat_Bagian_Hist
  (
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    reject_remark,
    deleteStatus,
    deleteDate
  )
  SELECT
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    NULL,
    'UPDATE',
    GETDATE()
  FROM inserted;
END;
GO

IF OBJECT_ID(N'dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_DELETE', N'TR') IS NOT NULL
  DROP TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_DELETE;
GO

CREATE TRIGGER dbo.trigger_T_Kalibrasi_Sertifikat_Bagian_DELETE
ON dbo.T_Kalibrasi_Sertifikat_Bagian
AFTER DELETE
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.T_Kalibrasi_Sertifikat_Bagian_Hist
  (
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    reject_remark,
    deleteStatus,
    deleteDate
  )
  SELECT
    QA_ID,
    ID_No_Sertifikat,
    Jenis_kalibrasi,
    Parameter_Sertifikasi,
    isSert_Manual,
    tgl,
    Assm_nama_instrumen,
    Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi,
    Assm_Merk,
    SERIAL_NUMBER,
    Assm_Kapasitas,
    Assm_Lokasi,
    Nama,
    No_Ident_No_batch,
    No_Sertifikat,
    Tertelusur_melalui,
    Rekalibrasi,
    Tgl_kalibrasi,
    Interval,
    Metode_kalibrasi,
    Suhu_Kelembaban,
    Catatan,
    Group_Da_Dept,
    Parameter_Kalibrasi,
    UserID,
    Delegated_To,
    Process_date,
    flag_update,
    NULL,
    'DELETE',
    GETDATE()
  FROM deleted;
END;
GO
