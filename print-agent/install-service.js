/**
 * Windows Service Installer
 * Installs the Print Agent as a Windows Service with auto-start
 *
 * Usage:
 *   node install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');
const config = require('./config');

// Create a new service object
const svc = new Service({
  name: config.SERVICE_NAME,
  description: config.SERVICE_DESCRIPTION,
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Listen for the "install" event
svc.on('install', () => {
  console.log('✓ Service installed successfully!');
  console.log(`  Name: ${config.SERVICE_NAME}`);
  console.log(`  Description: ${config.SERVICE_DESCRIPTION}`);
  console.log('');
  console.log('Starting service...');
  svc.start();
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', () => {
  console.log('⚠ Service is already installed.');
  console.log('To reinstall:');
  console.log('  1. Run: node uninstall-service.js');
  console.log('  2. Run: node install-service.js');
});

// Listen for the "start" event
svc.on('start', () => {
  console.log('✓ Service started!');
  console.log('');
  console.log('The Print Agent is now running as a Windows Service.');
  console.log('It will start automatically when Windows boots.');
  console.log('');
  console.log('To manage the service:');
  console.log('  - Services.msc (Windows Services Manager)');
  console.log('  - Or use: net start/stop ' + config.SERVICE_NAME);
  console.log('');
  console.log('Logs location: ' + path.join(__dirname, 'logs'));
});

// Listen for errors
svc.on('error', (err) => {
  console.error('✗ Service installation failed:', err);
});

// Install the service
console.log('Installing eValidasi Print Agent as Windows Service...');
console.log('');
svc.install();
