/**
 * eValidasi Local Print Agent
 *
 * This service runs on Windows machines and:
 * 1. Polls the backend for pending print jobs
 * 2. Downloads PDF files securely
 * 3. Prints silently to configured Windows printers
 * 4. Reports status back to backend
 *
 * Can run as:
 * - Windows Service (auto-start on boot)
 * - Console application (for testing)
 * - System tray application
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');
const PrinterManager = require('./printer-manager');
const config = require('./config');

class PrintAgent {
  constructor() {
    this.agentId = config.AGENT_ID;
    this.apiUrl = config.API_URL;
    this.pollingInterval = config.POLLING_INTERVAL || 10000; // 10 seconds
    this.isRunning = false;
    this.printerManager = new PrinterManager();
    this.tempDir = path.join(__dirname, 'temp');
  }

  /**
   * Start the print agent
   */
  async start() {
    logger.info('=== eValidasi Print Agent Starting ===');
    logger.info(`Agent ID: ${this.agentId}`);
    logger.info(`API URL: ${this.apiUrl}`);
    logger.info(`Polling Interval: ${this.pollingInterval}ms`);

    // Create temp directory
    await fs.mkdir(this.tempDir, { recursive: true });

    // Initialize printer manager
    await this.printerManager.initialize();
    logger.info(`Available printers: ${this.printerManager.getPrinterNames().join(', ')}`);

    // Start polling
    this.isRunning = true;
    this.poll();

    logger.info('Print Agent started successfully');
  }

  /**
   * Stop the print agent
   */
  async stop() {
    logger.info('Print Agent stopping...');
    this.isRunning = false;

    // Cleanup temp files
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
    } catch (err) {
      logger.error('Cleanup error:', err);
    }

    logger.info('Print Agent stopped');
  }

  /**
   * Main polling loop
   */
  async poll() {
    while (this.isRunning) {
      try {
        await this.checkForJobs();
      } catch (error) {
        logger.error('Polling error:', error.message);
      }

      // Wait before next poll
      await this.sleep(this.pollingInterval);
    }
  }

  /**
   * Check for pending print jobs
   */
  async checkForJobs() {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/print-job`, {
        params: {
          agentId: this.agentId,
          status: 'pending',
          limit: 5,
        },
        timeout: 10000,
      });

      const jobs = response.data?.data?.jobs || [];

      if (jobs.length > 0) {
        logger.info(`Found ${jobs.length} pending print job(s)`);

        for (const job of jobs) {
          await this.processJob(job);
        }
      }
    } catch (error) {
      if (error.response) {
        logger.error(`API error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        logger.error('Network error: No response from server');
      } else {
        logger.error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Process a single print job
   */
  async processJob(job) {
    const { jobId, downloadUrl, fileHash, printerProfile, copies, documentType } = job;

    logger.info(`Processing job ${jobId}`);
    logger.info(`  Document Type: ${documentType}`);
    logger.info(`  Printer Profile: ${printerProfile || 'default'}`);
    logger.info(`  Copies: ${copies}`);

    try {
      // Download PDF
      const filePath = await this.downloadFile(jobId, downloadUrl, fileHash);

      // Get printer name
      const printerName = await this.printerManager.resolvePrinter(printerProfile);

      if (!printerName) {
        throw new Error(`No printer found for profile: ${printerProfile}`);
      }

      logger.info(`  Using printer: ${printerName}`);

      // Print the document
      await this.printDocument(filePath, printerName, copies);

      // Report success
      await this.updateJobStatus(jobId, 'completed', {
        printerName,
        printedPages: 1, // You can extract actual page count from PDF
      });

      logger.info(`Job ${jobId} completed successfully`);

      // Cleanup
      await fs.unlink(filePath);
    } catch (error) {
      logger.error(`Job ${jobId} failed: ${error.message}`);
      logger.error('Error stack:', error.stack);

      // Report failure
      await this.updateJobStatus(jobId, 'failed', {
        errorMessage: error.message,
      });
    }
  }

  /**
   * Download print file
   */
  async downloadFile(jobId, downloadUrl, expectedHash) {
    logger.info(`  Downloading file for job ${jobId}...`);

    const filePath = path.join(this.tempDir, `${jobId}.pdf`);

    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const fileData = Buffer.from(response.data);

    // Verify file integrity
    const actualHash = crypto.createHash('sha256').update(fileData).digest('hex');

    if (actualHash !== expectedHash) {
      throw new Error('File integrity check failed - hash mismatch');
    }

    logger.info(`  File integrity verified (SHA-256)`);

    // Save file
    await fs.writeFile(filePath, fileData);

    return filePath;
  }

  /**
   * Print document silently
   */
  async printDocument(filePath, printerName, copies) {
    logger.info(`  Printing to ${printerName}...`);

    // Use pdf-to-printer for silent printing
    const ptp = require('pdf-to-printer');

    const options = {
      printer: printerName,
      copies: copies,
      // Add more options as needed:
      // scale: 'fit',
      // orientation: 'portrait',
      // side: 'duplex', // or 'simplex'
    };

    await ptp.print(filePath, options);

    logger.info(`  Print command sent successfully`);
  }

  /**
   * Update job status on backend
   */
  async updateJobStatus(jobId, status, data = {}) {
    try {
      await axios.patch(
        `${this.apiUrl}/v2/print-job/${jobId}/status`,
        {
          status,
          ...data,
        },
        {
          timeout: 10000,
        }
      );

      logger.info(`  Status updated: ${status}`);
    } catch (error) {
      logger.error(`Failed to update job status:`, error.message);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
let agent;

async function shutdown() {
  logger.info('Received shutdown signal');
  if (agent) {
    await agent.stop();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the agent
(async () => {
  try {
    agent = new PrintAgent();
    await agent.start();
  } catch (error) {
    logger.error('Failed to start print agent:', error);
    process.exit(1);
  }
})();

module.exports = PrintAgent;
