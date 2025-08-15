/**
 * Base Controller Class
 * Generic controller operations that can be extended by app-specific controllers
 */

import { successResponse, createAppLogger } from '../utils/index.js';

/**
 * Base class for controllers
 * Provides common controller operations and response handling
 */
export class BaseController {
  constructor(service, options = {}) {
    this.service = service;
    this.logger = createAppLogger(options.logContext || 'Controller');
    this.resourceName = options.resourceName || 'Resource';
    this.successMessages = options.successMessages || {};
    this.errorMessages = options.errorMessages || {};
  }

  /**
   * Generic method to get all records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async getAllRecords(req, res, methodName = 'getAllRecords', options = {}) {
    try {
      const queryParams = this.extractQueryParams(req);
      const userContext = req.user || null;
      
      // Pass user context to service method if service supports it
      const serviceMethod = this.service[methodName];
      const records = serviceMethod.length > 1 
        ? await this.service[methodName](queryParams, userContext, options)
        : await this.service[methodName](queryParams, options);
      
      const recordCount = Array.isArray(records) ? records.length : 
                         (records.comments ? records.comments.length : 
                          (records.data ? records.data.length : 0));
      
      this.logger.info(`${this.resourceName} records retrieved successfully`, { 
        count: recordCount, 
        queryParams,
        userId: userContext?.id,
        isAuthenticated: !!userContext?.id
      });
      
      return res.status(200).json(
        successResponse(records, this.successMessages.retrieved || `${this.resourceName} records retrieved successfully`)
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve ${this.resourceName} records`, { 
        queryParams: req.query,
        userId: req.user?.id 
      }, error);
      throw error;
    }
  }

  /**
   * Generic method to get record by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async getRecordById(req, res, methodName = 'getRecordById', options = {}) {
    try {
      const { id } = req.params;
      const record = await this.service[methodName](id, options);
      
      this.logger.info(`${this.resourceName} retrieved successfully`, { id });
      
      return res.status(200).json(
        successResponse(record, this.successMessages.retrieved || `${this.resourceName} retrieved successfully`)
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve ${this.resourceName} by ID`, { id: req.params.id }, error);
      throw error;
    }
  }

  /**
   * Generic method to create a record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async createRecord(req, res, methodName = 'createRecord', options = {}) {
    try {
      const data = req.body;
      const userContext = req.user || null;
      
      // Pass user context to service method if service supports it
      const serviceMethod = this.service[methodName];
      const newRecord = serviceMethod.length > 1 
        ? await this.service[methodName](data, userContext, options)
        : await this.service[methodName](data, options);
      
      this.logger.info(`${this.resourceName} created successfully`, {
        id: newRecord.id,
        userId: userContext?.id,
        data: this.sanitizeLogData(data)
      });
      
      return res.status(201).json(
        successResponse(
          { id: newRecord.id, createdAt: newRecord.createdAt },
          this.successMessages.created || `${this.resourceName} created successfully`
        )
      );
    } catch (error) {
      this.logger.error(`Failed to create ${this.resourceName}`, { 
        data: this.sanitizeLogData(req.body),
        userId: req.user?.id 
      }, error);
      throw error;
    }
  }

  /**
   * Generic method to update a record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async updateRecord(req, res, methodName = 'updateRecord', options = {}) {
    try {
      const { id } = req.params;
      const data = req.body;
      const updatedRecord = await this.service[methodName](id, data, options);
      
      this.logger.info(`${this.resourceName} updated successfully`, { 
        id, 
        data: this.sanitizeLogData(data) 
      });
      
      return res.status(200).json(
        successResponse({
          updatedAt: updatedRecord.updatedAt
        }, this.successMessages.updated || `${this.resourceName} updated successfully`)
      );
    } catch (error) {
      this.logger.error(`Failed to update ${this.resourceName}`, { 
        id: req.params.id, 
        data: this.sanitizeLogData(req.body) 
      }, error);
      throw error;
    }
  }

  /**
   * Generic method to delete a record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async deleteRecord(req, res, methodName = 'deleteRecord', options = {}) {
    try {
      const { id } = req.params;
      await this.service[methodName](id, options);
      
      this.logger.info(`${this.resourceName} deleted successfully`, { id });
      
      return res.status(200).json(
        successResponse(null, this.successMessages.deleted || `${this.resourceName} deleted successfully`)
      );
    } catch (error) {
      this.logger.error(`Failed to delete ${this.resourceName}`, { id: req.params.id }, error);
      throw error;
    }
  }

  /**
   * Generic method to search records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async searchRecords(req, res, methodName = 'searchRecords', options = {}) {
    try {
      const { q: searchTerm, limit } = req.query;
      const records = await this.service[methodName](searchTerm, { ...options, limit });
      
      this.logger.info(`${this.resourceName} search completed`, { 
        searchTerm, 
        results: records.length,
        limit 
      });
      
      return res.status(200).json(
        successResponse(records, this.successMessages.search || `${this.resourceName} search completed`)
      );
    } catch (error) {
      this.logger.error(`Failed to search ${this.resourceName}`, { 
        searchTerm: req.query.q, 
        limit: req.query.limit 
      }, error);
      throw error;
    }
  }

  /**
   * Generic method to get statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {string} methodName - Service method name to call
   * @param {Object} options - Additional options for the service call
   */
  async getStats(req, res, methodName = 'getStats', options = {}) {
    try {
      const stats = await this.service[methodName](options);
      
      this.logger.info(`${this.resourceName} statistics retrieved successfully`);
      
      return res.status(200).json(
        successResponse(stats, this.successMessages.stats || `${this.resourceName} statistics retrieved successfully`)
      );
    } catch (error) {
      this.logger.error(`Failed to get ${this.resourceName} statistics`, {}, error);
      throw error;
    }
  }

  /**
   * Extract and process query parameters from request
   * @param {Object} req - Express request object
   * @returns {Object} Processed query parameters
   */
  extractQueryParams(req) {
    const { 
      page, 
      limit, 
      sort, 
      order, 
      includeDeleted, 
      search,
      ...otherParams 
    } = req.query;

    const params = {
      ...otherParams,
      ...(page && { page: parseInt(page) }),
      ...(limit && { limit: parseInt(limit) }),
      ...(sort && { sort }),
      ...(order && { order: order.toUpperCase() }),
      ...(includeDeleted && { includeDeleted: includeDeleted === 'true' }),
      ...(search && { search }),
    };

    return params;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = sanitized[field].substring(0, 10) + '...';
      }
    });
    
    return sanitized;
  }

  /**
   * Validate required fields in request body
   * @param {Object} body - Request body
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} Validation result
   */
  validateRequiredFields(body, requiredFields) {
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle pagination parameters
   * @param {Object} req - Express request object
   * @returns {Object} Pagination options
   */
  getPaginationOptions(req) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0
      }
    };
  }

  /**
   * Apply pagination to response
   * @param {Array} data - Data array
   * @param {Object} pagination - Pagination options
   * @param {number} total - Total count of records
   * @returns {Object} Paginated response
   */
  applyPagination(data, pagination, total) {
    const pages = Math.ceil(total / pagination.limit);
    
    return {
      data,
      pagination: {
        ...pagination,
        total,
        pages,
        hasNext: pagination.page < pages,
        hasPrev: pagination.page > 1
      }
    };
  }
}
