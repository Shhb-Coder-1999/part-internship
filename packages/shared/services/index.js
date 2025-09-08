/**
 * Base Service Class
 * Minimal base service for extending in other services
 */

import { createAppLogger } from '../utils/logger.js';

export class BaseService {
  constructor(dbService, options = {}) {
    this.dbService = dbService;
    this.resourceName = options.resourceName || 'Resource';
    this.logContext = options.logContext || 'Service';
    this.logger = createAppLogger(`${this.resourceName}Service`);
    this.requiredFields = options.requiredFields || [];
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(data, fields = this.requiredFields) {
    for (const field of fields) {
      if (!data || data[field] === undefined || data[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Generic method for logging operations
   */
  logOperation(operation, data, error = null) {
    if (error) {
      this.logger.error(`${operation} failed`, { data }, error);
    } else {
      this.logger.info(`${operation} completed`, { data });
    }
  }
}