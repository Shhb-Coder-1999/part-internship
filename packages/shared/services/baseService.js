/**
 * Base Service Class
 * Generic service operations that can be extended by app-specific services
 */

import { ValidationError, NotFoundError, BusinessLogicError, createAppLogger } from '../utils/index.js';

/**
 * Base class for services
 * Provides common service operations and business logic validation
 */
export class BaseService {
  constructor(databaseService, options = {}) {
    this.dbService = databaseService;
    this.logger = createAppLogger(options.logContext || 'Service');
    this.resourceName = options.resourceName || 'Resource';
    this.validationRules = options.validationRules || {};
    this.requiredFields = options.requiredFields || [];
  }

  /**
   * Generic method to get all records
   * @param {Object} params - Query parameters
   * @param {Object} options - Additional options
   * @returns {Array} Array of records
   */
  async getAllRecords(params = {}, options = {}) {
    try {
      return await this.dbService.getAllRecords(params, options);
    } catch (error) {
      this.logger.error(`Failed to retrieve ${this.resourceName} records`, { params, options }, error);
      throw error;
    }
  }

  /**
   * Generic method to get record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Additional options
   * @returns {Object} Record object
   */
  async getRecordById(id, options = {}) {
    try {
      const record = await this.dbService.getRecordById(id, options);
      if (!record) {
        this.logger.warn(`${this.resourceName} not found by ID`, { id });
        throw new NotFoundError(`${this.resourceName} not found`, { id });
      }
      return record;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      this.logger.error(`Failed to retrieve ${this.resourceName} by ID`, { id }, error);
      throw error;
    }
  }

  /**
   * Generic method to create a record
   * @param {Object} data - Record data
   * @param {Object} options - Additional options
   * @returns {Object} Created record
   */
  async createRecord(data, options = {}) {
    try {
      // Validate input data
      const validation = this.validateData(data);
      if (!validation.isValid) {
        this.logger.warn(`${this.resourceName} validation failed`, { 
          data: this.sanitizeLogData(data), 
          errors: validation.errors 
        });
        throw new ValidationError('Validation failed', validation.errors);
      }

      // Create record
      const newRecord = await this.dbService.createRecord(data, options);
      this.logger.info(`${this.resourceName} created successfully`, { 
        id: newRecord.id, 
        data: this.sanitizeLogData(data) 
      });
      return newRecord;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      this.logger.error(`Failed to create ${this.resourceName}`, { data: this.sanitizeLogData(data) }, error);
      throw error;
    }
  }

  /**
   * Generic method to update a record
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Additional options
   * @returns {Object} Updated record
   */
  async updateRecord(id, data, options = {}) {
    try {
      // Validate input data
      const validation = this.validateData(data);
      if (!validation.isValid) {
        this.logger.warn(`${this.resourceName} update validation failed`, { 
          id, 
          data: this.sanitizeLogData(data), 
          errors: validation.errors 
        });
        throw new ValidationError('Validation failed', validation.errors);
      }

      // Check if record exists and can be updated
      const existingRecord = await this.dbService.getRecordById(id);
      const modificationCheck = this.canModifyRecord(existingRecord);

      if (!modificationCheck.canModify) {
        this.logger.warn(`${this.resourceName} modification check failed`, { 
          id, 
          reason: modificationCheck.reason 
        });
        
        if (!existingRecord) {
          throw new NotFoundError(`${this.resourceName} not found`, { id });
        }
        throw new BusinessLogicError(modificationCheck.reason, { id });
      }

      // Update record
      const updatedRecord = await this.dbService.updateRecord(id, data, options);
      return updatedRecord;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error(`Failed to update ${this.resourceName}`, { id, data: this.sanitizeLogData(data) }, error);
      throw error;
    }
  }

  /**
   * Generic method to delete a record
   * @param {string} id - Record ID
   * @param {Object} options - Additional options
   * @returns {Object} Deletion result
   */
  async deleteRecord(id, options = {}) {
    try {
      // Check if record exists and can be deleted
      const existingRecord = await this.dbService.getRecordById(id);
      const modificationCheck = this.canModifyRecord(existingRecord);

      if (!modificationCheck.canModify) {
        this.logger.warn(`${this.resourceName} deletion check failed`, { 
          id, 
          reason: modificationCheck.reason 
        });
        
        if (!existingRecord) {
          throw new NotFoundError(`${this.resourceName} not found`, { id });
        }
        throw new BusinessLogicError(modificationCheck.reason, { id });
      }

      // Delete record
      const result = await this.dbService.softDeleteRecord(id, options);
      this.logger.info(`${this.resourceName} deleted successfully`, { id });
      return result;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessLogicError) {
        throw error;
      }
      this.logger.error(`Failed to delete ${this.resourceName}`, { id }, error);
      throw error;
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
      return await this.dbService.searchRecords(searchTerm, options);
    } catch (error) {
      this.logger.error(`Failed to search ${this.resourceName}`, { searchTerm, options }, error);
      throw error;
    }
  }

  /**
   * Generic method to get statistics
   * @param {Object} options - Additional options
   * @returns {Object} Statistics object
   */
  async getStats(options = {}) {
    try {
      return await this.dbService.getRecordStats(options);
    } catch (error) {
      this.logger.error(`Failed to get ${this.resourceName} statistics`, { options }, error);
      throw error;
    }
  }

  /**
   * Validate data according to business rules
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  validateData(data) {
    const errors = [];

    // Check required fields
    this.requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    });

    // Apply custom validation rules
    if (this.validationRules) {
      Object.entries(this.validationRules).forEach(([field, rules]) => {
        if (data[field] !== undefined) {
          const fieldValidation = this.validateField(data[field], field, rules);
          if (!fieldValidation.isValid) {
            errors.push(...fieldValidation.errors);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a specific field according to rules
   * @param {any} value - Field value
   * @param {string} fieldName - Field name
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   */
  validateField(value, fieldName, rules) {
    const errors = [];

    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`
      });
    }

    if (value !== undefined && value !== null) {
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.minLength} characters long`
        });
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} cannot exceed ${rules.maxLength} characters`
        });
      }

      if (rules.min && typeof value === 'number' && value < rules.min) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.min}`
        });
      }

      if (rules.max && typeof value === 'number' && value > rules.max) {
        errors.push({
          field: fieldName,
          message: `${fieldName} cannot exceed ${rules.max}`
        });
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} format is invalid`
        });
      }

      if (rules.custom && typeof rules.custom === 'function') {
        const customValidation = rules.custom(value, fieldName);
        if (customValidation && !customValidation.isValid) {
          errors.push(...customValidation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a record can be modified
   * @param {Object} record - Record object to check
   * @returns {Object} Result with canModify and reason
   */
  canModifyRecord(record) {
    if (!record) {
      return {
        canModify: false,
        reason: `${this.resourceName} does not exist`
      };
    }

    if (record.isDeleted) {
      return {
        canModify: false,
        reason: `${this.resourceName} is deleted`
      };
    }

    return {
      canModify: true,
      reason: null
    };
  }

  /**
   * Check if a record can be interacted with
   * @param {Object} record - Record object to check
   * @returns {Object} Result with canInteract and reason
   */
  canInteractWithRecord(record) {
    if (!record) {
      return {
        canInteract: false,
        reason: `${this.resourceName} does not exist`
      };
    }

    if (record.isDeleted) {
      return {
        canInteract: false,
        reason: `${this.resourceName} is deleted`
      };
    }

    return {
      canInteract: true,
      reason: null
    };
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
}
