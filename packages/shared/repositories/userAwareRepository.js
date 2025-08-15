/**
 * User-Aware Repository Base Class
 * Automatically filters data by user ownership for data isolation
 */

import { BaseRepository } from './baseRepository.js';
import { createAppLogger } from '../utils/index.js';

export class UserAwareRepository extends BaseRepository {
  constructor(prismaClient, options = {}) {
    super(prismaClient, options);
    this.userField = options.userField || 'userId';
    this.logger = createAppLogger(`${options.logContext || 'Repository'}-UserAware`);
  }

  /**
   * Apply user filtering to where clause
   * @param {Object} where - Base where clause
   * @param {string|null} userId - User ID to filter by
   * @param {boolean} isPublic - Whether this is a public query
   * @param {boolean} isAdmin - Whether user is admin
   * @returns {Object} Modified where clause
   */
  applyUserFilter(where = {}, userId = null, isPublic = false, isAdmin = false) {
    // Don't filter for admins unless explicitly requested
    if (isAdmin && !isPublic) {
      this.logger.debug('Admin access - no user filtering applied', { userId });
      return where;
    }

    // For authenticated users, show only their data (unless public query)
    if (!isPublic && userId) {
      where[this.userField] = userId;
      this.logger.debug('User filtering applied', { userId, userField: this.userField });
    }

    return where;
  }

  /**
   * Get records with automatic user filtering
   * @param {Object} options - Query options
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Query results with metadata
   */
  async getUserFilteredRecords(options = {}, userContext = null) {
    try {
      const {
        page = 1,
        limit = 20,
        includeDeleted = false,
        isPublic = false,
        ...otherOptions
      } = options;

      const userId = userContext?.id || null;
      const isAdmin = userContext?.roles?.includes('admin') || false;

      let where = { ...otherOptions };
      
      // Apply soft delete filter
      if (!includeDeleted && this.options.softDeleteField) {
        where[this.options.softDeleteField] = false;
      }

      // Apply user filtering
      where = this.applyUserFilter(where, userId, isPublic, isAdmin);

      const skip = (page - 1) * limit;
      const [records, total] = await Promise.all([
        this.prisma[this.options.modelName].findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma[this.options.modelName].count({ where }),
      ]);

      return {
        data: records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        meta: {
          isPublic,
          filteredByUser: !isPublic && !!userId,
          isAdmin,
          userId
        }
      };
    } catch (error) {
      this.logger.error('Failed to retrieve user-filtered records', { options, userContext }, error);
      throw error;
    }
  }

  /**
   * Get all records with user filtering
   * @param {Object} options - Query options
   * @param {Object} userContext - User context from request
   * @returns {Promise<Array>} Records array
   */
  async getAllUserFilteredRecords(options = {}, userContext = null) {
    try {
      const {
        includeDeleted = false,
        isPublic = false,
        orderBy = { createdAt: 'desc' },
        ...otherOptions
      } = options;

      const userId = userContext?.id || null;
      const isAdmin = userContext?.roles?.includes('admin') || false;

      let where = { ...otherOptions };
      
      // Apply soft delete filter
      if (!includeDeleted && this.options.softDeleteField) {
        where[this.options.softDeleteField] = false;
      }

      // Apply user filtering
      where = this.applyUserFilter(where, userId, isPublic, isAdmin);

      return await this.prisma[this.options.modelName].findMany({
        where,
        orderBy,
      });
    } catch (error) {
      this.logger.error('Failed to retrieve all user-filtered records', { options, userContext }, error);
      throw error;
    }
  }

  /**
   * Create record with automatic user assignment
   * @param {Object} data - Record data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Created record
   */
  async createUserRecord(data, userContext) {
    try {
      if (!userContext?.id) {
        throw new Error('User context required for creating records');
      }

      const recordData = {
        ...data,
        [this.userField]: userContext.id
      };

      const record = await this.prisma[this.options.modelName].create({
        data: recordData
      });

      this.logger.info('User record created', {
        recordId: record.id,
        userId: userContext.id,
        modelName: this.options.modelName
      });

      return record;
    } catch (error) {
      this.logger.error('Failed to create user record', { data, userContext }, error);
      throw error;
    }
  }

  /**
   * Update record with ownership verification
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Updated record
   */
  async updateUserRecord(id, data, userContext) {
    try {
      if (!userContext?.id) {
        throw new Error('User context required for updating records');
      }

      // First check if record exists and user owns it
      const existingRecord = await this.prisma[this.options.modelName].findUnique({
        where: { id }
      });

      if (!existingRecord) {
        throw new Error(`${this.options.modelName} not found`);
      }

      const isAdmin = userContext.roles?.includes('admin') || false;
      const isOwner = existingRecord[this.userField] === userContext.id;

      if (!isOwner && !isAdmin) {
        throw new Error('Not authorized to update this record');
      }

      const updatedRecord = await this.prisma[this.options.modelName].update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      this.logger.info('User record updated', {
        recordId: id,
        userId: userContext.id,
        isAdmin,
        isOwner,
        modelName: this.options.modelName
      });

      return updatedRecord;
    } catch (error) {
      this.logger.error('Failed to update user record', { id, data, userContext }, error);
      throw error;
    }
  }

  /**
   * Delete record with ownership verification
   * @param {string} id - Record ID
   * @param {Object} userContext - User context from request
   * @returns {Promise<Object>} Deleted record
   */
  async deleteUserRecord(id, userContext) {
    try {
      if (!userContext?.id) {
        throw new Error('User context required for deleting records');
      }

      // First check if record exists and user owns it
      const existingRecord = await this.prisma[this.options.modelName].findUnique({
        where: { id }
      });

      if (!existingRecord) {
        throw new Error(`${this.options.modelName} not found`);
      }

      const isAdmin = userContext.roles?.includes('admin') || false;
      const isOwner = existingRecord[this.userField] === userContext.id;

      if (!isOwner && !isAdmin) {
        throw new Error('Not authorized to delete this record');
      }

      let deletedRecord;
      
      // Use soft delete if configured
      if (this.options.softDeleteField) {
        deletedRecord = await this.prisma[this.options.modelName].update({
          where: { id },
          data: { [this.options.softDeleteField]: true }
        });
      } else {
        deletedRecord = await this.prisma[this.options.modelName].delete({
          where: { id }
        });
      }

      this.logger.info('User record deleted', {
        recordId: id,
        userId: userContext.id,
        isAdmin,
        isOwner,
        softDelete: !!this.options.softDeleteField,
        modelName: this.options.modelName
      });

      return deletedRecord;
    } catch (error) {
      this.logger.error('Failed to delete user record', { id, userContext }, error);
      throw error;
    }
  }

  /**
   * Get single record with ownership verification
   * @param {string} id - Record ID
   * @param {Object} userContext - User context from request
   * @param {boolean} isPublic - Whether this is a public access
   * @returns {Promise<Object|null>} Record or null
   */
  async getUserRecord(id, userContext = null, isPublic = false) {
    try {
      const record = await this.prisma[this.options.modelName].findUnique({
        where: { id }
      });

      if (!record) {
        return null;
      }

      // For public access, return record as-is
      if (isPublic) {
        return record;
      }

      // Check ownership for private access
      if (userContext?.id) {
        const isAdmin = userContext.roles?.includes('admin') || false;
        const isOwner = record[this.userField] === userContext.id;

        if (!isOwner && !isAdmin) {
          throw new Error('Not authorized to access this record');
        }
      }

      return record;
    } catch (error) {
      this.logger.error('Failed to get user record', { id, userContext, isPublic }, error);
      throw error;
    }
  }
}