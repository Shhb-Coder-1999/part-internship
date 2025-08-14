/**
 * Base Repository Class
 * Generic repository operations that can be extended by app-specific repositories
 */

import {
  DatabaseError,
  NotFoundError,
  createAppLogger,
} from '../utils/index.js';

export class BaseRepository {
  constructor(prismaClient, options = {}) {
    this.prisma = prismaClient;
    this.logger = createAppLogger(options.logContext || 'Repository');
    this.modelName = options.modelName || 'Model';
    this.softDeleteField = options.softDeleteField || 'isDeleted';
    this.timestampFields = options.timestampFields || [
      'createdAt',
      'updatedAt',
    ];
    this.defaultUserId = options.defaultUserId || 'default-user-id';
  }

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
        options,
      });
      return records;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve ${this.modelName} records`,
        { options },
        error
      );
      throw new DatabaseError(
        `Failed to retrieve ${this.modelName} records: ${error.message}`
      );
    }
  }

  async getRecordById(id, include = null) {
    try {
      const record = await this.prisma[this.modelName].findUnique({
        where: { id },
        ...(include && { include }),
      });
      return record;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve ${this.modelName} by ID`,
        { id },
        error
      );
      throw new DatabaseError(
        `Failed to retrieve ${this.modelName}: ${error.message}`,
        { id }
      );
    }
  }

  async createRecord(data, include = null) {
    try {
      const recordData = {
        ...data,
        ...(this.timestampFields.includes('createdAt') && {
          createdAt: new Date(),
        }),
        ...(this.timestampFields.includes('updatedAt') && {
          updatedAt: new Date(),
        }),
      };
      const newRecord = await this.prisma[this.modelName].create({
        data: recordData,
        ...(include && { include }),
      });
      this.logger.info(`${this.modelName} created successfully`, {
        id: newRecord.id,
        data: this.sanitizeLogData(data),
      });
      return newRecord;
    } catch (error) {
      this.logger.error(
        `Failed to create ${this.modelName}`,
        { data: this.sanitizeLogData(data) },
        error
      );
      throw new DatabaseError(
        `Failed to create ${this.modelName}: ${error.message}`,
        { data: this.sanitizeLogData(data) }
      );
    }
  }

  async updateRecord(id, data, include = null) {
    try {
      const updateData = {
        ...data,
        ...(this.timestampFields.includes('updatedAt') && {
          updatedAt: new Date(),
        }),
      };
      const updatedRecord = await this.prisma[this.modelName].update({
        where: { id },
        data: updateData,
        ...(include && { include }),
      });
      this.logger.info(`${this.modelName} updated successfully`, {
        id,
        data: this.sanitizeLogData(data),
      });
      return updatedRecord;
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(`${this.modelName} not found for update`, { id });
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, {
          id,
        });
      }
      this.logger.error(
        `Failed to update ${this.modelName}`,
        { id, data: this.sanitizeLogData(data) },
        error
      );
      throw new DatabaseError(
        `Failed to update ${this.modelName}: ${error.message}`,
        { id }
      );
    }
  }

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
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, {
          id,
        });
      }
      this.logger.error(`Failed to delete ${this.modelName}`, { id }, error);
      throw new DatabaseError(
        `Failed to delete ${this.modelName}: ${error.message}`,
        { id }
      );
    }
  }

  async hardDeleteRecord(id) {
    try {
      await this.prisma[this.modelName].delete({ where: { id } });
      this.logger.info(`${this.modelName} hard deleted successfully`, { id });
      return { success: true, id };
    } catch (error) {
      if (error.code === 'P2025') {
        this.logger.warn(`${this.modelName} not found for hard deletion`, {
          id,
        });
        throw new NotFoundError(`${this.modelName} with ID '${id}' not found`, {
          id,
        });
      }
      this.logger.error(
        `Failed to hard delete ${this.modelName}`,
        { id },
        error
      );
      throw new DatabaseError(
        `Failed to hard delete ${this.modelName}: ${error.message}`,
        { id }
      );
    }
  }

  async searchRecords(searchTerm, options = {}) {
    try {
      const { searchField = 'text', limit = 10, where = {} } = options;
      const searchConditions = {
        ...where,
        [searchField]: { contains: searchTerm, mode: 'insensitive' },
      };
      const records = await this.prisma[this.modelName].findMany({
        where: searchConditions,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      this.logger.debug(`${this.modelName} search completed`, {
        searchTerm,
        results: records.length,
        limit,
      });
      return records;
    } catch (error) {
      this.logger.error(
        `Failed to search ${this.modelName}`,
        { searchTerm, options },
        error
      );
      throw new DatabaseError(
        `Failed to search ${this.modelName}: ${error.message}`,
        { searchTerm, options }
      );
    }
  }

  async getRecordStats(where = {}) {
    try {
      const stats = await this.prisma[this.modelName].aggregate({
        where,
        _count: { id: true },
      });
      return { totalRecords: stats._count.id };
    } catch (error) {
      this.logger.error(
        `Failed to get ${this.modelName} stats`,
        { where },
        error
      );
      throw new DatabaseError(
        `Failed to get ${this.modelName} stats: ${error.message}`
      );
    }
  }

  async recordExists(id) {
    try {
      const count = await this.prisma[this.modelName].count({ where: { id } });
      return count > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check if ${this.modelName} exists`,
        { id },
        error
      );
      throw new DatabaseError(
        `Failed to check if ${this.modelName} exists: ${error.message}`,
        { id }
      );
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = sanitized[field].substring(0, 10) + '...';
      }
    });
    return sanitized;
  }
}
