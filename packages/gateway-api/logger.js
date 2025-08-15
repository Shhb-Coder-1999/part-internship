import pino from 'pino';

/**
 * Enhanced Logger Configuration
 * Better terminal output with colors and formatting
 */

const loggerConfig = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        levelFirst: true,
        customColors: 'err:red,warn:yellow,info:blue,debug:green',
        customPrettifiers: {
          time: timestamp => `🕐 ${timestamp}`,
          level: level => {
            const emojis = {
              error: '❌',
              warn: '⚠️',
              info: 'ℹ️',
              debug: '🐛',
            };
            return `${emojis[level] || '📝'} ${level.toUpperCase()}`;
          },
        },
      },
    },
    level: 'debug',
  },
  production: {
    level: 'info',
  },
};

const environment = process.env.NODE_ENV || 'development';
const config = loggerConfig[environment];

export const logger = pino(config);

// Convenience methods
export const log = {
  info: (msg, data = {}) => logger.info(data, msg),
  error: (msg, error = {}) => logger.error(error, msg),
  warn: (msg, data = {}) => logger.warn(data, msg),
  debug: (msg, data = {}) => logger.debug(data, msg),

  // Special methods for common operations
  serverStart: (port, host = 'localhost') =>
    logger.info(`🚀 Server started successfully on http://${host}:${port}`),

  serverError: error =>
    logger.error(`💥 Server error: ${error.message}`, { error }),

  dbConnected: () => logger.info('🗄️ Database connected successfully'),

  dbError: error =>
    logger.error(`💾 Database error: ${error.message}`, { error }),

  routeRegistered: (method, path) =>
    logger.info(`🛣️ Route registered: ${method.toUpperCase()} ${path}`),

  authSuccess: email =>
    logger.info(`🔐 Authentication successful for ${email}`),

  authFailed: (email, reason) =>
    logger.warn(`🚫 Authentication failed for ${email}: ${reason}`),
};

export default logger;
