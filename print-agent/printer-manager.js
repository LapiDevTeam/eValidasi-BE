/**
 * Printer Manager
 * Handles Windows printer enumeration and profile mapping
 */

const ptp = require('pdf-to-printer');
const logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PrinterManager {
  constructor() {
    this.printers = [];
    this.profiles = new Map();
    this.defaultPrinter = null;
    this.configPath = path.join(__dirname, 'printer-config.json');
  }

  /**
   * Initialize printer manager
   */
  async initialize() {
    logger.info('Initializing Printer Manager...');

    // Get all installed printers using PowerShell (more reliable on Windows)
    try {
      const psCommand = 'Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json';
      const output = execSync(`powershell -Command "${psCommand}"`, {
        encoding: 'utf8',
        windowsHide: true
      });

      const printers = JSON.parse(output);

      if (Array.isArray(printers)) {
        this.printers = printers.map(p => p.Name);
      } else if (printers.Name) {
        // Single printer
        this.printers = [printers.Name];
      } else {
        this.printers = [];
      }
    } catch (error) {
      logger.error('Failed to get printers via PowerShell:', error.message);

      // Fallback: try pdf-to-printer
      try {
        this.printers = await ptp.getPrinters();
        if (!Array.isArray(this.printers)) {
          this.printers = [];
        }
      } catch (ptpError) {
        logger.error('Failed to get printers via pdf-to-printer:', ptpError.message);
        this.printers = [];
      }
    }

    // Find default printer (first one or named "default")
    if (this.printers.length > 0) {
      this.defaultPrinter = this.printers[0];
      logger.info(`Default printer: ${this.defaultPrinter}`);
    } else {
      logger.warn('No printers found. Please ensure printers are installed.');
      this.defaultPrinter = 'Microsoft Print to PDF';
    }

    // Load printer profiles
    await this.loadProfiles();

    logger.info(`Loaded ${this.printers.length} printer(s)`);
  }

  /**
   * Load printer profiles from config file
   */
  async loadProfiles() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);

      if (config.profiles) {
        for (const [profileName, printerName] of Object.entries(config.profiles)) {
          this.profiles.set(profileName, printerName);
          logger.info(`Loaded profile: ${profileName} → ${printerName}`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load printer profiles:', error.message);
      }
      // Create default config
      await this.saveProfiles();
    }
  }

  /**
   * Save printer profiles to config file
   */
  async saveProfiles() {
    const config = {
      profiles: Object.fromEntries(this.profiles),
      printers: this.printers.map((name) => ({
        name: name,
        isDefault: name === this.defaultPrinter,
      })),
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get all available printer names
   */
  getPrinterNames() {
    return this.printers;
  }

  /**
   * Get printer info by name
   */
  getPrinterInfo(printerName) {
    return this.printers.includes(printerName) ? { name: printerName } : null;
  }

  /**
   * Resolve printer profile to physical printer name
   */
  async resolvePrinter(printerProfile) {
    // If no profile specified, use default
    if (!printerProfile || printerProfile === 'default') {
      return this.defaultPrinter;
    }

    // Check if it's a profile name
    if (this.profiles.has(printerProfile)) {
      const printerName = this.profiles.get(printerProfile);

      // Verify printer exists
      if (this.printerExists(printerName)) {
        return printerName;
      } else {
        logger.warn(`Printer ${printerName} not found for profile ${printerProfile}`);
        return this.defaultPrinter;
      }
    }

    // Check if it's a direct printer name
    if (this.printerExists(printerProfile)) {
      return printerProfile;
    }

    // Not found, use default
    logger.warn(`Printer or profile ${printerProfile} not found`);
    return this.defaultPrinter;
  }

  /**
   * Check if printer exists
   */
  printerExists(printerName) {
    return this.printers.includes(printerName);
  }

  /**
   * Add or update printer profile
   */
  async addProfile(profileName, printerName) {
    if (!this.printerExists(printerName)) {
      throw new Error(`Printer not found: ${printerName}`);
    }

    this.profiles.set(profileName, printerName);
    await this.saveProfiles();

    logger.info(`Profile added/updated: ${profileName} → ${printerName}`);
  }

  /**
   * Remove printer profile
   */
  async removeProfile(profileName) {
    if (this.profiles.delete(profileName)) {
      await this.saveProfiles();
      logger.info(`Profile removed: ${profileName}`);
      return true;
    }
    return false;
  }

  /**
   * Refresh printer list
   */
  async refresh() {
    try {
      const psCommand = 'Get-Printer | Select-Object Name, PrinterStatus | ConvertTo-Json';
      const output = execSync(`powershell -Command "${psCommand}"`, {
        encoding: 'utf8',
        windowsHide: true
      });

      const printers = JSON.parse(output);

      if (Array.isArray(printers)) {
        this.printers = printers.map(p => p.Name);
      } else if (printers.Name) {
        this.printers = [printers.Name];
      } else {
        this.printers = [];
      }

      if (this.printers.length > 0) {
        this.defaultPrinter = this.printers[0];
      }
      logger.info('Printer list refreshed');
    } catch (error) {
      logger.error('Failed to refresh printers:', error.message);
    }
  }

  /**
   * Get printer status (simplified - pdf-to-printer doesn't provide detailed status)
   */
  getPrinterStatus(printerName) {
    const p = this.getPrinterInfo(printerName);
    if (!p) {
      return 'not_found';
    }
    // pdf-to-printer doesn't provide status info, assume ready if printer exists
    return 'ready';
  }
}

module.exports = PrinterManager;
