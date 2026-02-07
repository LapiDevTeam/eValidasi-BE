/**
 * PrintJob Model
 * Stores print job information for Local Print Agent
 */

module.exports = (sequelize, DataTypes) => {
  const PrintJob = sequelize.define(
    'PrintJob',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      jobId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique job identifier (PJ-timestamp-random)',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'User who created the print job',
      },
      agentId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'default',
        comment: 'Local Print Agent identifier',
      },
      documentId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Reference to the document being printed',
      },
      documentType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Type of document (sertifikasi, permohonan, etc.)',
      },
      printerProfile: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Printer profile name or ID',
      },
      printerName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Actual printer name used (reported by agent)',
      },
      copies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of copies to print',
      },
      orientation: {
        type: DataTypes.ENUM('portrait', 'landscape'),
        allowNull: false,
        defaultValue: 'portrait',
      },
      pageSize: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'A4',
        comment: 'A4, Letter, Legal, etc.',
      },
      margins: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of margins {top, right, bottom, left}',
      },
      options: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of additional print options',
      },
      filePath: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Local file path to generated PDF',
      },
      fileHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'SHA-256 hash of PDF file for integrity',
      },
      downloadToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'JWT token for secure download',
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current job status',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if job failed',
      },
      printedPages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Number of pages printed (reported by agent)',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the job was completed or failed',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When the job and file should be cleaned up',
      },
    },
    {
      tableName: 'print_jobs',
      timestamps: false,
      indexes: [
        { fields: ['jobId'] },
        { fields: ['userId'] },
        { fields: ['agentId', 'status'] },
        { fields: ['status', 'createdAt'] },
        { fields: ['expiresAt'] },
      ],
    }
  );

  return PrintJob;
};
