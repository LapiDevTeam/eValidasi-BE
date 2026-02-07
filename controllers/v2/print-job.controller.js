/**
 * Print Job Controller (Simplified - No JWT/Database)
 * Handles PDF generation and print job management
 * for Local Print Agent integration
 *
 * Uses in-memory storage - replace with database when ready
 */

const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// In-memory storage (replace with database later)
const printJobs = new Map();
const printerProfiles = new Map();

// Initialize default printer profile
printerProfiles.set('default', {
  name: 'default',
  printerName: 'Microsoft Print to PDF',
  agentId: 'default',
  isDefault: true,
  isActive: true,
  settings: {},
});

class PrintJobController {
  /**
   * Create a new print job
   * POST /api/v2/print-job
   */
  async createPrintJob(req, res, next) {
    try {
      const {
        documentId,
        documentType,
        printerProfile,
        copies = 1,
        orientation = 'portrait',
        pageSize = 'A4',
        margins = { top: 20, right: 20, bottom: 20, left: 20 },
        options = {},
      } = req.body;

      const userId = req.user?.id || 'anonymous';
      const agentId = req.body.agentId || 'default';

      // Validate required fields
      if (!documentId || !documentType) {
        return res.status(400).json({
          success: false,
          message: 'documentId and documentType are required',
        });
      }

      // Generate unique job ID
      const jobId = `PJ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // Generate PDF based on document type
      const pdfPath = await this.generatePDF({
        documentId,
        documentType,
        orientation,
        pageSize,
        margins,
        options,
        userId,
      });

      // Generate simple download token
      const downloadToken = Buffer.from(`${jobId}:${Date.now()}`).toString('base64');

      // Create print job record (in-memory)
      const printJob = {
        jobId,
        userId,
        agentId,
        documentId,
        documentType,
        printerProfile: printerProfile || 'default',
        copies,
        orientation,
        pageSize,
        margins,
        options,
        filePath: pdfPath,
        fileHash: await this.calculateFileHash(pdfPath),
        downloadToken,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      printJobs.set(jobId, printJob);

      // Construct download URL
      const downloadUrl = `${req.protocol}://${req.get('host')}/v2/print-job/${jobId}/download?token=${downloadToken}`;

      res.status(201).json({
        success: true,
        data: {
          jobId,
          downloadUrl,
          downloadToken,
          status: 'pending',
          expiresAt: printJob.expiresAt,
          message: 'Print job created successfully. Waiting for agent to pick up.',
        },
      });
    } catch (error) {
      console.error('Create print job error:', error);
      next(error);
    }
  }

  /**
   * Get pending print jobs for agent (polling endpoint)
   * GET /api/v2/print-job?status=pending&agentId=xyz
   */
  async getPendingJobs(req, res, next) {
    try {
      const agentId = req.query.agentId || 'default';
      const status = req.query.status || 'pending';
      const limit = parseInt(req.query.limit) || 10;

      // Filter jobs from memory
      const jobs = Array.from(printJobs.values())
        .filter((job) => job.agentId === agentId && job.status === status)
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, limit);

      // Generate download URLs
      const jobsWithUrls = jobs.map((job) => {
        const downloadToken = Buffer.from(`${job.jobId}:${Date.now()}`).toString('base64');
        const downloadUrl = `${req.protocol}://${req.get('host')}/v2/print-job/${job.jobId}/download?token=${downloadToken}`;

        return {
          jobId: job.jobId,
          documentType: job.documentType,
          printerProfile: job.printerProfile,
          copies: job.copies,
          orientation: job.orientation,
          pageSize: job.pageSize,
          margins: job.margins,
          options: job.options,
          fileHash: job.fileHash,
          status: job.status,
          downloadUrl,
          downloadToken,
          createdAt: job.createdAt,
          expiresAt: job.expiresAt,
        };
      });

      res.json({
        success: true,
        data: {
          jobs: jobsWithUrls,
          count: jobsWithUrls.length,
        },
      });
    } catch (error) {
      console.error('Get pending jobs error:', error);
      next(error);
    }
  }

  /**
   * Get specific job status
   * GET /api/v2/print-job/:jobId
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = printJobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Print job not found',
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job.jobId,
          status: job.status,
          documentType: job.documentType,
          printerProfile: job.printerProfile,
          copies: job.copies,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          errorMessage: job.errorMessage,
          printedPages: job.printedPages,
        },
      });
    } catch (error) {
      console.error('Get job status error:', error);
      next(error);
    }
  }

  /**
   * Download job PDF file
   * GET /api/v2/print-job/:jobId/download?token=xyz
   */
  async downloadJobFile(req, res, next) {
    try {
      const { jobId } = req.params;
      const { token } = req.query;

      // Simple token validation (just check if provided)
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Download token required',
        });
      }

      // Get job
      const job = printJobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Print job not found',
        });
      }

      // Check file exists
      const filePath = job.filePath;
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({
          success: false,
          message: 'Print file not found or expired',
        });
      }

      // Send file with hash in headers for verification
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${jobId}.pdf"`);
      res.setHeader('X-File-Hash', job.fileHash);
      res.setHeader('X-Job-Id', jobId);

      const fileStream = require('fs').createReadStream(filePath);
      fileStream.pipe(res);

      // Update status to processing
      if (job.status === 'pending') {
        job.status = 'processing';
      }
    } catch (error) {
      console.error('Download job file error:', error);
      next(error);
    }
  }

  /**
   * Update job status (agent reports)
   * PATCH /api/v2/print-job/:jobId/status
   */
  async updateJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const { status, errorMessage, printedPages, printerName } = req.body;

      const job = printJobs.get(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Print job not found',
        });
      }

      job.status = status;

      if (status === 'completed') {
        job.completedAt = new Date();
        job.printedPages = printedPages || 1;
        job.printerName = printerName;

        // Schedule file cleanup after 5 minutes
        setTimeout(async () => {
          try {
            await fs.unlink(job.filePath);
            printJobs.delete(jobId);
            console.log(`Cleaned up print job: ${jobId}`);
          } catch (err) {
            console.error('Cleanup error:', err);
          }
        }, 300000);
      }

      if (status === 'failed') {
        job.errorMessage = errorMessage;
        job.completedAt = new Date();
      }

      res.json({
        success: true,
        message: 'Job status updated successfully',
        data: {
          jobId,
          status: job.status,
        },
      });
    } catch (error) {
      console.error('Update job status error:', error);
      next(error);
    }
  }

  /**
   * Get printer profiles
   * GET /api/v2/printer-profiles
   */
  async getPrinterProfiles(req, res, next) {
    try {
      const agentId = req.query.agentId || 'default';

      const profiles = Array.from(printerProfiles.values())
        .filter((p) => p.agentId === agentId && p.isActive)
        .sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return a.name.localeCompare(b.name);
        });

      res.json({
        success: true,
        data: profiles,
      });
    } catch (error) {
      console.error('Get printer profiles error:', error);
      next(error);
    }
  }

  /**
   * Save printer profile
   * POST /api/v2/printer-profiles
   */
  async savePrinterProfile(req, res, next) {
    try {
      const { name, printerName, agentId, isDefault, settings } = req.body;

      if (!name || !printerName) {
        return res.status(400).json({
          success: false,
          message: 'name and printerName are required',
        });
      }

      const profileId = `${agentId || 'default'}-${name}`;

      // If setting as default, unset other defaults
      if (isDefault) {
        printerProfiles.forEach((profile) => {
          if (profile.agentId === (agentId || 'default')) {
            profile.isDefault = false;
          }
        });
      }

      const profile = {
        id: profileId,
        name,
        printerName,
        agentId: agentId || 'default',
        isDefault: isDefault || false,
        settings: settings || {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      printerProfiles.set(profileId, profile);

      res.status(201).json({
        success: true,
        message: 'Printer profile saved',
        data: profile,
      });
    } catch (error) {
      console.error('Save printer profile error:', error);
      next(error);
    }
  }

  /**
   * Generate PDF based on document type
   * Uses puppeteer for complex HTML rendering
   */
  async generatePDF({ documentId, documentType, orientation, pageSize, margins, options, userId }) {
    const tmpDir = path.join(__dirname, '../../tmp/print-jobs');
    await fs.mkdir(tmpDir, { recursive: true });

    const filename = `${documentType}-${documentId}-${Date.now()}.pdf`;
    const filePath = path.join(tmpDir, filename);

    // Example: Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set page format
    const pageFormat = this.getPageFormat(pageSize, orientation);

    // Example: Render document (replace with your actual document rendering logic)
    const html = await this.renderDocumentHTML(documentId, documentType, options, userId);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: filePath,
      format: pageFormat.format,
      landscape: orientation === 'landscape',
      margin: margins,
      printBackground: true,
    });

    await browser.close();

    return filePath;
  }

  /**
   * Get page format configuration
   */
  getPageFormat(pageSize, orientation) {
    const formats = {
      A4: { format: 'A4', width: '210mm', height: '297mm' },
      Letter: { format: 'Letter', width: '8.5in', height: '11in' },
      Legal: { format: 'Legal', width: '8.5in', height: '14in' },
    };

    return formats[pageSize] || formats.A4;
  }

  /**
   * Render document HTML based on type
   * Replace this with your actual document rendering logic
   */
  async renderDocumentHTML(documentId, documentType, options, userId) {
    // This is a placeholder - implement your actual document rendering
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; }
          .content { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${documentType} - ${documentId}</h1>
        </div>
        <div class="content">
          <p>Document Type: ${documentType}</p>
          <p>Document ID: ${documentId}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>User ID: ${userId}</p>
          <p>This is a test print document.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Calculate file hash for integrity verification
   */
  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }
}

// Export instance with bound methods
const controller = new PrintJobController();

module.exports = {
  createPrintJob: controller.createPrintJob.bind(controller),
  getPendingJobs: controller.getPendingJobs.bind(controller),
  getJobStatus: controller.getJobStatus.bind(controller),
  downloadJobFile: controller.downloadJobFile.bind(controller),
  updateJobStatus: controller.updateJobStatus.bind(controller),
  getPrinterProfiles: controller.getPrinterProfiles.bind(controller),
  savePrinterProfile: controller.savePrinterProfile.bind(controller),
};
