/**
 * Logger configuration for Print Agent
 * Uses winston with daily rotate files
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, 'logs');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      if (stack) {
        return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
      }
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),

    // Daily rotating file for all logs
    new DailyRotateFile({
      dirname: logDir,
      filename: 'print-agent-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // Separate file for errors
    new DailyRotateFile({
      dirname: logDir,
      filename: 'print-agent-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

module.exports = logger;
