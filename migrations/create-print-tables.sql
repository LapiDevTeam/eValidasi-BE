-- Migration: Create print_jobs table
-- Run this in your SQL Server database

CREATE TABLE print_jobs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    jobId NVARCHAR(100) NOT NULL UNIQUE,
    userId INT NOT NULL,
    agentId NVARCHAR(100) NOT NULL DEFAULT 'default',
    documentId NVARCHAR(100) NOT NULL,
    documentType NVARCHAR(50) NOT NULL,
    printerProfile NVARCHAR(100) NULL,
    printerName NVARCHAR(255) NULL,
    copies INT NOT NULL DEFAULT 1,
    orientation NVARCHAR(20) NOT NULL DEFAULT 'portrait',
    pageSize NVARCHAR(20) NOT NULL DEFAULT 'A4',
    margins NVARCHAR(MAX) NULL,
    options NVARCHAR(MAX) NULL,
    filePath NVARCHAR(500) NOT NULL,
    fileHash NVARCHAR(64) NOT NULL,
    downloadToken NVARCHAR(500) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending',
    errorMessage NVARCHAR(MAX) NULL,
    printedPages INT NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    completedAt DATETIME2 NULL,
    expiresAt DATETIME2 NOT NULL,

    CONSTRAINT CHK_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    CONSTRAINT CHK_orientation CHECK (orientation IN ('portrait', 'landscape'))
);

-- Create indexes
CREATE INDEX IX_print_jobs_jobId ON print_jobs(jobId);
CREATE INDEX IX_print_jobs_userId ON print_jobs(userId);
CREATE INDEX IX_print_jobs_agentId_status ON print_jobs(agentId, status);
CREATE INDEX IX_print_jobs_status_createdAt ON print_jobs(status, createdAt);
CREATE INDEX IX_print_jobs_expiresAt ON print_jobs(expiresAt);

-- Migration: Create printer_profiles table
CREATE TABLE printer_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    printerName NVARCHAR(255) NOT NULL,
    agentId NVARCHAR(100) NOT NULL DEFAULT 'default',
    isDefault BIT NOT NULL DEFAULT 0,
    isActive BIT NOT NULL DEFAULT 1,
    settings NVARCHAR(MAX) NULL,
    createdAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    updatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_printer_profiles_name_agentId UNIQUE (name, agentId)
);

-- Create indexes
CREATE INDEX IX_printer_profiles_agentId_isActive ON printer_profiles(agentId, isActive);
CREATE INDEX IX_printer_profiles_isDefault ON printer_profiles(isDefault);

-- Insert default printer profiles (optional)
INSERT INTO printer_profiles (name, printerName, agentId, isDefault, isActive)
VALUES
    ('default', 'Microsoft Print to PDF', 'default', 1, 1),
    ('thermal-label', 'Zebra ZD620', 'default', 0, 1),
    ('office-a4', 'HP LaserJet Pro', 'default', 0, 1);

-- Cleanup job to remove expired print jobs (schedule this)
-- Run daily via SQL Server Agent or external scheduler
/*
DELETE FROM print_jobs
WHERE expiresAt < DATEADD(hour, -24, GETDATE())
AND status IN ('completed', 'failed', 'cancelled');
*/
