/**
 * Windows Service Uninstaller
 * Removes the Print Agent Windows Service
 *
 * Usage:
 *   node uninstall-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');
const config = require('./config');

// Create a new service object
const svc = new Service({
  name: config.SERVICE_NAME,
  script: path.join(__dirname, 'index.js'),
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
  console.log('✓ Service uninstalled successfully!');
  console.log('The Print Agent service has been removed from Windows.');
});

// Listen for the "alreadyuninstalled" event
svc.on('alreadyuninstalled', () => {
  console.log('⚠ Service is not installed.');
});

// Listen for errors
svc.on('error', (err) => {
  console.error('✗ Service uninstallation failed:', err);
});

// Uninstall the service
console.log('Uninstalling eValidasi Print Agent service...');
console.log('');
svc.uninstall();
