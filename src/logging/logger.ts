import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, error?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

class WinstonLogger implements Logger {
  private logger: winston.Logger;

  constructor(name: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${name}] ${level.toUpperCase()}: ${message} ${
            Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''
          }`;
        })
      ),
      defaultMeta: { label: name },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log')
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: any): void {
    this.logger.error(message, error instanceof Error ? error.message : error);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

export function createLogger(name: string): Logger {
  return new WinstonLogger(name);
}
