/**
 * Base Repository Class
 * Minimal base repository for extending in other repositories
 */

import { createAppLogger } from '../utils/logger.js';

export class BaseRepository {
  constructor(prisma, options = {}) {
    this.prisma = prisma;
    this.modelName = options.modelName || 'Model';
    this.logContext = options.logContext || 'Repository';
    this.logger = createAppLogger(`${this.modelName}Repository`);
    this.softDeleteField = options.softDeleteField || 'isDeleted';
    this.timestampFields = options.timestampFields || { createdAt: 'createdAt', updatedAt: 'updatedAt' };
    this.defaultUserId = options.defaultUserId || 'default-user-id';
  }

  /**
   * Get model with common options
   */
  getModel() {
    return this.prisma[this.modelName];
  }

  /**
   * Build common where conditions
   */
  buildWhereConditions(conditions = {}) {
    const where = { ...conditions };
    
    // Add soft delete condition by default
    if (!where.hasOwnProperty(this.softDeleteField)) {
      where[this.softDeleteField] = false;
    }
    
    return where;
  }

  /**
   * Log database operations
   */
  logOperation(operation, data, error = null) {
    if (error) {
      this.logger.error(`${operation} failed`, { data }, error);
    } else {
      this.logger.debug(`${operation} completed`, { data });
    }
  }
}