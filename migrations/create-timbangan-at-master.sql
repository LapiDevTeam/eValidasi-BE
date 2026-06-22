-- =============================================================================
-- Timbangan (Electronic Balance) Calibration — Anak Timbangan (AT) master
-- Ports the hidden "MASTER AT" sheet of TIMBANGAN.xls.
-- Drives AT No.ID auto-fill (konvensional / UC) and auto-derivation of the
-- certificate's "II. IDENTITAS STANDAR" block.
-- SQL Server 2008 compatible, idempotent.
-- =============================================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_at_standards]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timbangan_at_standards] (
        [at_id]            INT             IDENTITY(1,1) PRIMARY KEY,
        [no_id]            VARCHAR(20)     NOT NULL,         -- AT number, e.g. '25', '156'
        [no_id_label]      VARCHAR(20)     NULL,             -- formatted, e.g. '025,'
        [konvensional_g]   DECIMAL(18,6)   NOT NULL,         -- conventional mass (gram)
        [uc_mg]            DECIMAL(18,6)   NOT NULL DEFAULT 0,-- standard uncertainty (mg, k=2)
        [no_sertifikat]    VARCHAR(255)    NULL,
        [rekalibrasi]      VARCHAR(100)    NULL,
        [tertelusur]       VARCHAR(255)    NULL,
        [kelas]            VARCHAR(20)     NULL,             -- E2 / F1 / M1 / M2
        [is_active]        BIT             NOT NULL DEFAULT 1,
        [created_at]       DATETIME        NOT NULL DEFAULT GETDATE(),
        [updated_at]       DATETIME        NULL
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_timbangan_at_no_id'
      AND object_id = OBJECT_ID(N'[dbo].[timbangan_at_standards]')
)
BEGIN
    CREATE INDEX [IX_timbangan_at_no_id]
        ON [dbo].[timbangan_at_standards] ([no_id], [is_active]);
END
GO

-- Calibration method label used by the workbook (MASTER AT!F2).
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[timbangan_config]')
      AND type = 'U'
)
BEGIN
    CREATE TABLE [dbo].[timbangan_config] (
        [config_key]   VARCHAR(50)   NOT NULL PRIMARY KEY,
        [config_value] VARCHAR(255)  NULL
    );
    INSERT INTO [dbo].[timbangan_config] (config_key, config_value)
    VALUES ('METODE_KALIBRASI', 'PK.VN.000006 REV 01');
END
GO

-- -----------------------------------------------------------------------------
-- Seed AT master (re-seed only when empty so manual edits survive re-runs).
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[timbangan_at_standards])
BEGIN
    INSERT INTO [dbo].[timbangan_at_standards]
        (no_id, no_id_label, konvensional_g, uc_mg, no_sertifikat, rekalibrasi, tertelusur, kelas)
    VALUES
        ('126','126',       200.00012,   0.07,  'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('125','125,',      200.00011,   0.07,  'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('124','124,',      100.00009,   0.035, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('123','123,',      50.00004,    0.023, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('122','122,',      20.000028,   0.017, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('121','121,',      20.000025,   0.017, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('120','120,',      10.000035,   0.013, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('119','119,',      5.000025,    0.011, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('118','118,',      2.000016,    0.009, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('117','117,',      2.000017,    0.009, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('116','116,',      1.000033,    0.007, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('115','115,',      0.499996777, 0.006, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('114','114,',      0.200010303, 0.005, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('113','113,',      0.200008303, 0.005, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('112','112,',      0.100005285, 0.003, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('111','111,',      0.05000546,  0.002, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('110','110,',      0.020001928, 0.002, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('109','109,',      0.020006096, 0.002, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('108','108,',      0.010005265, 0.002, 'M01453/ENBPAS',          'Nov 27', 'Sucofindo', 'E2'),
        ('44', '044,',      200.0001,    0.4,   'S.24 014 326,',          'Okt 27', 'Kaliman',   'E2'),
        ('12', '012,',      1.000037,    0.031, 'S.25 016 891,',          'Nov 27', 'Kaliman',   'F1'),
        ('13', '013,',      2.000023,    0.042, 'S.25 016 892,',          'Nov 27', 'Kaliman',   'F1'),
        ('14', '014,',      2.000021,    0.042, 'S.25 016 893,',          'Nov 27', 'Kaliman',   'F1'),
        ('15', '015,',      5.000045,    0.046, 'S.25 016 894,',          'Nov 27', 'Kaliman',   'F1'),
        ('16', '016,',      10.000029,   0.075, 'S.25 016 895,',          'Nov 27', 'Kaliman',   'F1'),
        ('17', '017,',      20.000085,   0.082, 'S.25 016 896,',          'Nov 27', 'Kaliman',   'F1'),
        ('18', '018,',      20.000078,   0.082, 'S.25 016 897,',          'Nov 27', 'Kaliman',   'F1'),
        ('19', '019,',      50.00003,    0.2,   'S.25 016 898,',          'Nov 27', 'Kaliman',   'F1'),
        ('20', '020,',      100.00078,   0.3,   'S.25 016 899,',          'Nov 27', 'Kaliman',   'F1'),
        ('21', '021,',      200.00024,   0.4,   'S.25 016 900,',          'Nov 27', 'Kaliman',   'F1'),
        ('22', '022,',      200.00015,   0.4,   'S.25 016 901,',          'Nov 27', 'Kaliman',   'F1'),
        ('23', '023,',      500.004,     1,     'S.25 016 902,',          'Nov 27', 'Kaliman',   'F1'),
        ('24', '024,',      1000.006,    2,     'S.25 016 903,',          'Nov 27', 'Kaliman',   'F1'),
        ('25', '025,',      2000.002,    4,     'S.25 016 904,',          'Nov 27', 'Kaliman',   'F1'),
        ('26', '026,',      2000.012,    4,     'S.25 016 905,',          'Nov 27', 'Kaliman',   'F1'),
        ('27', '027,',      5000.01,     8,     'S.25 016 906,',          'Nov 27', 'Kaliman',   'F1'),
        ('28', '028,',      10000.015,   16,    'S.25 016 907,',          'Nov 27', 'Kaliman',   'F1'),
        ('55', '055,',      10000.05,    140,   'S.22 014 920,',          'Okt 25', 'Kaliman',   'M1'),
        ('56', '056,',      5000.05,     70,    'S.22 014 919,',          'Okt 25', 'Kaliman',   'M1'),
        ('57', '057',       2000.018,    3.3,   '41490/ENBPAO,',          'Okt 25', 'Sucofindo', 'M1'),
        ('68', '068,',      0.001005568, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('69', '069,',      0.002006635, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('70', '070,',      0.002003802, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('71', '071,',      0.005003292, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('72', '072,',      0.010001111, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('73', '073,',      0.020002288, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('74', '074,',      0.020000953, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('75', '075,',      0.050003681, 0.002, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('76', '076,',      0.100002366, 0.003, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('77', '077,',      0.20000651,  0.005, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('78', '078,',      0.200001156, 0.005, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('79', '079,',      0.500008113, 0.006, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('80', '080,',      1.00001,     0.007, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('81', '081,',      2.000008,    0.009, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('82', '082,',      2.000002,    0.009, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('83', '083,',      5.000019,    0.011, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('84', '084,',      10.000009,   0.013, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('85', '085,',      20.000004,   0.017, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('86', '086,',      20.000009,   0.017, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('87', '087,',      50.00002,    0.067, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('88', '088,',      99.99994,    0.035, 'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('89', '089,',      200.0002,    0.07,  'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('90', '090,',      200.00032,   0.07,  'M01452/ENBPAS,',         'Nov 26', 'Sucofindo', 'E2'),
        ('11', '011,',      50000.009,   20,    '2671/PKTN.4.7/09/2021,', 'Sep 24', 'Metrologi', 'F1'),
        ('10', '010,',      9999.983,    17,    '41491/ENBPAO,',          'Okt 24', 'Sucofindo', 'F1'),
        ('9',  '009,',      2000.243,    3.3,   '41487/ENBPAO,',          'Okt 24', 'Sucofindo', 'M2'),
        ('156','156,',      20000,       29,    'BMD/AT-20/PT.LL.II/010,','Jun 26', 'BMD Lab.',  'F1'),
        ('157','157,',      20000,       29,    'BMD/AT-20/PT.LL.II/007,','Jun 26', 'BMD Lab.',  'F1'),
        ('158','158,',      20000,       29,    'BMD/AT-20/PT.LL.II/008,','Jun 26', 'BMD Lab.',  'F1'),
        ('159','159,',      20000,       29,    'BMD/AT-20/PT.LL.II/011,','Jun 26', 'BMD Lab.',  'F1'),
        ('160','160,',      20000,       29,    'BMD/AT-20/PT.LL.II/012,','Jun 26', 'BMD Lab.',  'F1'),
        ('161','161,',      20000,       29,    'BMD/AT-20/PT.LL.II/006,','Jun 26', 'BMD Lab.',  'F1'),
        ('162','162,',      20000,       29,    'BMD/AT-20/PT.LL.II/009,','Jun 26', 'BMD Lab.',  'F1');
END
GO
