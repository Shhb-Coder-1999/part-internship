/**
 * Logger Class
 * Provides structured logging across all applications
 */

import { format } from 'util';

// Log levels with numeric values for comparison
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// ANSI color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m'
};

// Log level colors
const LEVEL_COLORS = {
  ERROR: COLORS.RED,
  WARN: COLORS.YELLOW,
  INFO: COLORS.GREEN,
  DEBUG: COLORS.BLUE,
  TRACE: COLORS.CYAN
};

export class Logger {
  constructor(options = {}) {
    this.appName = options.appName || 'App';
    this.level = options.level || (process.env.LOG_LEVEL || 'INFO');
    this.enableColors = options.enableColors !== false;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.enableCaller = options.enableCaller !== false;
    this.outputToFile = options.outputToFile || false;
    this.logFilePath = options.logFilePath || null;
    this.maxFileSize = options.maxFileSize || '10m';
    this.maxFiles = options.maxFiles || 5;
    
    // Validate log level
    if (!LOG_LEVELS[this.level]) {
      this.level = 'INFO';
    }
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get caller information
   */
  getCallerInfo() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      // Skip the first 3 lines (Error, getCallerInfo, and the calling function)
      const callerLine = lines[3] || '';
      const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, filePath, line, column] = match;
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
        return `${fileName}:${line}`;
      }
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null, error = null) {
    const parts = [];
    
    // Timestamp
    if (this.enableTimestamp) {
      parts.push(`[${this.getTimestamp()}]`);
    }
    
    // App name
    parts.push(`[${this.appName}]`);
    
    // Log level
    const levelStr = `[${level}]`;
    if (this.enableColors) {
      parts.push(`${LEVEL_COLORS[level]}${levelStr}${COLORS.RESET}`);
    } else {
      parts.push(levelStr);
    }
    
    // Caller info
    if (this.enableCaller) {
      parts.push(`[${this.getCallerInfo()}]`);
    }
    
    // Message
    parts.push(message);
    
    // Data
    if (data) {
      if (typeof data === 'object') {
        parts.push(JSON.stringify(data, null, 2));
      } else {
        parts.push(data);
      }
    }
    
    // Error details
    if (error) {
      if (error.stack) {
        parts.push(`\nStack: ${error.stack}`);
      }
      if (error.details) {
        parts.push(`\nDetails: ${JSON.stringify(error.details, null, 2)}`);
      }
    }
    
    return parts.join(' ');
  }

  /**
   * Check if log level should be logged
   */
  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  /**
   * Log error message
   */
  error(message, data = null, error = null) {
    if (this.shouldLog('ERROR')) {
      const formattedMessage = this.formatMessage('ERROR', message, data, error);
      console.error(formattedMessage);
      this.writeToFile('ERROR', formattedMessage);
    }
  }

  /**
   * Log warning message
   */
  warn(message, data = null) {
    if (this.shouldLog('WARN')) {
      const formattedMessage = this.formatMessage('WARN', message, data);
      console.warn(formattedMessage);
      this.writeToFile('WARN', formattedMessage);
    }
  }

  /**
   * Log info message
   */
  info(message, data = null) {
    if (this.shouldLog('INFO')) {
      const formattedMessage = this.formatMessage('INFO', message, data);
      console.info(formattedMessage);
      this.writeToFile('INFO', formattedMessage);
    }
  }

  /**
   * Log debug message
   */
  debug(message, data = null) {
    if (this.shouldLog('DEBUG')) {
      const formattedMessage = this.formatMessage('DEBUG', message, data);
      console.debug(formattedMessage);
      this.writeToFile('DEBUG', formattedMessage);
    }
  }

  /**
   * Log trace message
   */
  trace(message, data = null) {
    if (this.shouldLog('TRACE')) {
      const formattedMessage = this.formatMessage('TRACE', message, data);
      console.trace(formattedMessage);
      this.writeToFile('TRACE', formattedMessage);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, responseTime = null) {
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : null,
      timestamp: this.getTimestamp()
    };

    if (res.statusCode >= 400) {
      this.error(`${req.method} ${req.url} - ${res.statusCode}`, logData);
    } else if (res.statusCode >= 300) {
      this.warn(`${req.method} ${req.url} - ${res.statusCode}`, logData);
    } else {
      this.info(`${req.method} ${req.url} - ${res.statusCode}`, logData);
    }
  }

  /**
   * Log database operation
   */
  logDatabase(operation, table, duration = null, error = null) {
    const logData = {
      operation,
      table,
      duration: duration ? `${duration}ms` : null,
      timestamp: this.getTimestamp()
    };

    if (error) {
      this.error(`Database ${operation} on ${table} failed`, logData, error);
    } else {
      this.debug(`Database ${operation} on ${table} completed`, logData);
    }
  }

  /**
   * Log authentication event
   */
  logAuth(event, userId = null, success = true, details = null) {
    const logData = {
      event,
      userId,
      success,
      timestamp: this.getTimestamp(),
      ...details
    };

    if (success) {
      this.info(`Authentication: ${event}`, logData);
    } else {
      this.warn(`Authentication failed: ${event}`, logData);
    }
  }

  /**
   * Log business logic event
   */
  logBusiness(event, entityType, entityId = null, details = null) {
    const logData = {
      event,
      entityType,
      entityId,
      timestamp: this.getTimestamp(),
      ...details
    };

    this.info(`Business: ${event}`, logData);
  }

  /**
   * Write log to file (placeholder for file logging implementation)
   */
  writeToFile(level, message) {
    // TODO: Implement file logging with rotation
    // This could use winston, pino, or custom file writing
    if (this.outputToFile && this.logFilePath) {
      // Implementation would go here
    }
  }

  /**
   * Create child logger with specific context
   */
  child(context) {
    return new Logger({
      ...this,
      appName: `${this.appName}:${context}`
    });
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.level = level;
      this.info(`Log level changed to ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Get current log level
   */
  getLevel() {
    return this.level;
  }

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled() {
    return this.shouldLog('DEBUG');
  }

  /**
   * Check if trace logging is enabled
   */
  isTraceEnabled() {
    return this.shouldLog('TRACE');
  }
}

// Create default logger instance
export const logger = new Logger({
  appName: 'comment',
  level: process.env.LOG_LEVEL || 'INFO',
  enableColors: process.env.NODE_ENV !== 'production',
  enableTimestamp: true,
  enableCaller: process.env.NODE_ENV === 'development'
});

// Export log levels for configuration
export { LOG_LEVELS };

// Utility function to create logger for specific app
export const createAppLogger = (appName, options = {}) => {
  return new Logger({
    appName,
    level: process.env.LOG_LEVEL || 'INFO',
    enableColors: process.env.NODE_ENV !== 'production',
    enableTimestamp: true,
    enableCaller: process.env.NODE_ENV === 'development',
    ...options
  });
};
