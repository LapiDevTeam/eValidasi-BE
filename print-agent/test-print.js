/**
 * Test Print Script
 * Tests the print agent functionality without running as service
 *
 * Usage:
 *   node test-print.js
 */

const PrinterManager = require('./printer-manager');
const logger = require('./logger');
const ptp = require('pdf-to-printer');
const path = require('path');

async function testPrinters() {
  console.log('=== Testing Print Agent ===\n');

  // Initialize printer manager
  const printerManager = new PrinterManager();
  await printerManager.initialize();

  console.log('\n--- Available Printers ---');
  const printers = printerManager.getPrinterNames();
  printers.forEach((name, index) => {
    const info = printerManager.getPrinterInfo(name);
    const isDefault = info.isDefault ? '(DEFAULT)' : '';
    const status = printerManager.getPrinterStatus(name);
    console.log(`${index + 1}. ${name} ${isDefault}`);
    console.log(`   Status: ${status}`);
  });

  console.log('\n--- Default Printer ---');
  console.log(printerManager.defaultPrinter || 'None');

  console.log('\n--- Printer Profiles ---');
  if (printerManager.profiles.size > 0) {
    for (const [profile, printer] of printerManager.profiles) {
      console.log(`${profile} → ${printer}`);
    }
  } else {
    console.log('No profiles configured');
  }

  console.log('\n--- Test Complete ---');
  console.log('To test actual printing, place a test.pdf in this directory');
  console.log('and uncomment the print test code below.\n');

  // Uncomment to test actual printing:
  /*
  const testPdfPath = path.join(__dirname, 'test.pdf');
  if (require('fs').existsSync(testPdfPath)) {
    console.log('Printing test.pdf to default printer...');
    await ptp.print(testPdfPath, { printer: printerManager.defaultPrinter });
    console.log('Print job sent!');
  }
  */
}

testPrinters().catch(console.error);
