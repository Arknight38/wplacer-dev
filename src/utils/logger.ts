/**
 * Structured logger for wplacer using Winston
 */

import winston from 'winston';
import { DATA_DIR } from '../config/constants.js';
import { existsSync, mkdirSync } from 'node:fs';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about the colors
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport with colorization
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `[${info.timestamp}] ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    ),
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: `${DATA_DIR}/logs.log`,
    level: 'info',
    format,
  }),
  // File transport for error logs only
  new winston.transports.File({
    filename: `${DATA_DIR}/errors.log`,
    level: 'error',
    format,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

/**
 * Main log function - uses Winston for all logging
 * Winston handles both file and console output
 */
export function log(
  id: string,
  name: string,
  data: string,
  error?: Error
): void {
  const who = `(${name}#${id})`;
  const message = `${who} ${data}`;

  if (error) {
    logger.error(message, error);
  } else {
    logger.info(message);
  }
}

/**
 * Convenience methods for different log levels
 */
export const logError = (id: string, name: string, data: string, error?: Error): void => {
  const who = `(${name}#${id})`;
  const message = `${who} ${data}`;

  if (error) {
    logger.error(message, error);
  } else {
    logger.error(message);
  }
};

export const logWarn = (id: string, name: string, data: string): void => {
  const who = `(${name}#${id})`;
  logger.warn(`${who} ${data}`);
};

export const logDebug = (id: string, name: string, data: string): void => {
  const who = `(${name}#${id})`;
  logger.debug(`${who} ${data}`);
};
