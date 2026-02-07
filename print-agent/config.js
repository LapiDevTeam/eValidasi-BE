/**
 * Print Agent Configuration
 *
 * IMPORTANT: Configure these values before running the agent
 */

require('dotenv').config();

module.exports = {
  // Unique identifier for this agent instance
  AGENT_ID: process.env.AGENT_ID || 'default',

  // Backend API URL
  API_URL: process.env.API_URL || 'http://localhost:3001',

  // Polling interval in milliseconds (default: 10 seconds)
  POLLING_INTERVAL: parseInt(process.env.POLLING_INTERVAL) || 10000,

  // Logging level
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Service configuration
  SERVICE_NAME: 'eValidasiPrintAgent',
  SERVICE_DESCRIPTION: 'eValidasi Local Print Agent - Silent printing service',
};
