/**
 * PrinterProfile Model
 * Maps logical printer names to physical Windows printer names
 * Allows users to configure printer preferences
 */

module.exports = (sequelize, DataTypes) => {
  const PrinterProfile = sequelize.define(
    'PrinterProfile',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Logical profile name (e.g., "thermal-label", "office-a4")',
      },
      printerName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Physical Windows printer name',
      },
      agentId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'default',
        comment: 'Local Print Agent identifier',
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default printer for the agent',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this profile is active',
      },
      settings: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON string of printer settings (quality, color mode, etc.)',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'printer_profiles',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['name', 'agentId'] },
        { fields: ['agentId', 'isActive'] },
        { fields: ['isDefault'] },
      ],
    }
  );

  return PrinterProfile;
};
