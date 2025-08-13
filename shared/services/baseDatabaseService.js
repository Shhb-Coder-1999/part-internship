/**
 * Base Database Service Class
 * Generic database operations that can be extended by app-specific services
 */

import { DatabaseError, NotFoundError, createAppLogger } from '../utils/index.js';

/**
 * Base class for database services
 * Provides common database operations and error handling
 */
export class BaseDatabaseService {
  constructor(prismaClient, options = {}) {
    this.prisma = prismaClient;
    this.logger = createAppLogger(options.logContext || 'DatabaseService');
    this.modelName = options.modelName || 'Model';
    this.softDeleteField = options.softDeleteField || 'isDeleted';
    this.timestampFields = options.timestampFields || ['createdAt', 'updatedAt'];
    this.defaultUserId = options.defaultUserId || 'default-user-id';
  }

  /**
   * Generic method to get all records with optional filtering
   * @param {Object} options - Query options
   * @param {Object} options.where - Where clause conditions
   * @param {Object} options.include - Include relations
   * @param {Object} options.orderBy - Order by clause
   * @param {number} options.limit - Limit results
   * @param {number} options.offset - Offset for pagination
   * @returns {Array} Array of records
   */
  async getAllRecords(options = {}) {
    try {
      const { where = {}, include, orderBy, limit, offset } = options;
      
      const queryOptions = {
        where,
        ...(include && { include }),
        ...(orderBy && { orderBy }),
        ...(limit && { take: limit }),
        ...(offset && { skip: offset }),
      };

      const records = await this.prisma[this.modelName].findMany(queryOptions);

      this.logger.debug(`${this.modelName} records retrieved successfully`, { 
        count: records.length, 
        options 
      });
      
      return records;
    } catch (error) {
      this.logger.error(`Failed to retrieve ${this.modelName} records`, { options }, error);
      throw new DatabaseError(`Failed to retrieve ${this.modelName} records: ${error.message}`);
    }
  }

  /**
   * Generic method to get record by ID
   * @param {string} id - Record ID
   * @param {Object} include - Include relations
   * @returns {Object} Record object
   */
  async getRecordById(id, include = null) {
    try {
      const record = await this.prisma[this.modelName].findUnique({
        where: { id },
        ...(include && { include }),
      });

      return record;
    } catch (error) {
      this.logger.error(`Failed to retrieve ${this.modelName} by ID`, { id }, error);
      throw new DatabaseError(`Failed to retrieve ${this.modelName}: ${error.message}`, { id });
    }
  }

  /**
   * Generic method to create a record
   * @param {Object} data - Record data
   * @param {Object} include - Include relations
   * @returns {Object} Created record
   */
  async createRecord(data, include = null) {
    try {
      const recordData = {
        ...data,
        ...(this.timestampFields.includes('createdAt') && { createdAt: new Date() }),
        ...(this.timestampFields.includes('updatedAt') && { updatedAt: new Date() }),
      };

      const newRecord = await this.prisma[this.modelName].create({
        data: recordData,
        ...(include && { include }),
      });

      this.logger.info(`${this.modelName} created successfully`, { 
        id: newRecord.id, 
        data: this.sanitizeLogData(data) 
      });
      
      return newRecord;
    } catch (error) {
      this.logger.error(`Failed to create ${this.modelName}`, { data: this.sanitizeLogData(data) }, error);
      throw new DatabaseError(`Failed to create ${this.modelName}: ${error.message}`, { data: this.sanitizeLogData(data) });
    }
  }

  /**
   * Generic method to update a record
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} include - Include relations
   * @returns {Object} Updated record
   */
  async updateRecord(id, data, include = null) {
    try {
      const updateData = {
        ...data,
        ...(this.timestampFields.includes('updatedAt') && { updatedAt: new Date() }),
      };

      const updatedRecord = await this.prisma[this.modelName].update({
        where: { id },
        data: updateData,
        ...(include && { include }),
      });

      this.logger.info(`${this.modelName} updated successfully`, { 
        id, 
        data: this.sanitizeLogData(data) 
      });
      
      return updatedRecord;
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(`${this.modelName} not found for update`, { id });
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, { id });
      }
      this.logger.error(`Failed to update ${this.modelName}`, { id, data: this.sanitizeLogData(data) }, error);
      throw new DatabaseError(`Failed to update ${this.modelName}: ${error.message}`, { id });
    }
  }

  /**
   * Generic method to soft delete a record
   * @param {string} id - Record ID
   * @param {Object} include - Include relations
   * @returns {Object} Deleted record
   */
  async softDeleteRecord(id, include = null) {
    try {
      const deletedRecord = await this.prisma[this.modelName].update({
        where: { id },
        data: { [this.softDeleteField]: true },
        ...(include && { include }),
      });

      this.logger.info(`${this.modelName} soft deleted successfully`, { id });
      return deletedRecord;
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(`${this.modelName} not found for deletion`, { id });
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, { id });
      }
      this.logger.error(`Failed to delete ${this.modelName}`, { id }, error);
      throw new DatabaseError(`Failed to delete ${this.modelName}: ${error.message}`, { id });
    }
  }

  /**
   * Generic method to hard delete a record
   * @param {string} id - Record ID
   * @returns {Object} Deletion result
   */
  async hardDeleteRecord(id) {
    try {
      await this.prisma[this.modelName].delete({
        where: { id },
      });

      this.logger.info(`${this.modelName} hard deleted successfully`, { id });
      return { success: true, id };
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(`${this.modelName} not found for hard deletion`, { id });
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, { id });
      }
      this.logger.error(`Failed to hard delete ${this.modelName}`, { id }, error);
      throw new DatabaseError(`Failed to hard delete ${this.modelName}: ${error.message}`, { id });
    }
  }

  /**
   * Generic method to search records
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Array} Array of matching records
   */
  async searchRecords(searchTerm, options = {}) {
    try {
      const { searchField = 'text', limit = 10, where = {} } = options;
      
      const searchConditions = {
        ...where,
        [searchField]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      };

      const records = await this.prisma[this.modelName].findMany({
        where: searchConditions,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      this.logger.debug(`${this.modelName} search completed`, { 
        searchTerm, 
        results: records.length,
        limit 
      });
      
      return records;
    } catch (error) {
      this.logger.error(`Failed to search ${this.modelName}`, { searchTerm, options }, error);
      throw new DatabaseError(`Failed to search ${this.modelName}: ${error.message}`, { searchTerm, options });
    }
  }

  /**
   * Generic method to get record statistics
   * @param {Object} where - Where clause for filtering
   * @returns {Object} Statistics object
   */
  async getRecordStats(where = {}) {
    try {
      const stats = await this.prisma[this.modelName].aggregate({
        where,
        _count: { id: true },
      });

      return {
        totalRecords: stats._count.id,
      };
    } catch (error) {
      this.logger.error(`Failed to get ${this.modelName} stats`, { where }, error);
      throw new DatabaseError(`Failed to get ${this.modelName} stats: ${error.message}`);
    }
  }

  /**
   * Generic method to check if record exists
   * @param {string} id - Record ID
   * @returns {boolean} Whether record exists
   */
  async recordExists(id) {
    try {
      const count = await this.prisma[this.modelName].count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check if ${this.modelName} exists`, { id }, error);
      throw new DatabaseError(`Failed to check if ${this.modelName} exists: ${error.message}`, { id });
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = sanitized[field].substring(0, 10) + '...';
      }
    });
    
    return sanitized;
  }
}
