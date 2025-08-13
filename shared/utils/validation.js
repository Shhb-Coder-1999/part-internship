/**
 * Common validation utilities
 * Reusable validation functions across all apps
 */

/**
 * Validation rule structure
 * @typedef {Object} ValidationRule
 * @property {function(any): boolean} condition - Function that returns true if validation fails
 * @property {string} message - Error message if validation fails
 * @property {string} field - Field name for the error
 */

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Array} errors - Array of validation errors
 */

/**
 * Generic validation function
 * @param {any} data - Data to validate
 * @param {ValidationRule[]} rules - Array of validation rules
 * @returns {ValidationResult} Validation result
 */
export const validate = (data, rules) => {
  const errors = [];
  
  for (const rule of rules) {
    if (rule.condition(data)) {
      errors.push({
        field: rule.field || 'unknown',
        message: rule.message
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Common validation rules
 */
export const commonRules = {
  // Required field validation
  required: (fieldName) => ({
    condition: (value) => !value || (typeof value === 'string' && value.trim() === ''),
    message: `${fieldName} is required`,
    field: fieldName
  }),

  // String length validation
  minLength: (fieldName, min) => ({
    condition: (value) => typeof value === 'string' && value.length < min,
    message: `${fieldName} must be at least ${min} characters long`,
    field: fieldName
  }),

  maxLength: (fieldName, max) => ({
    condition: (value) => typeof value === 'string' && value.length > max,
    message: `${fieldName} must be no more than ${max} characters long`,
    field: fieldName
  }),

  // Email validation
  email: (fieldName) => ({
    condition: (value) => {
      if (!value) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value);
    },
    message: `${fieldName} must be a valid email address`,
    field: fieldName
  }),

  // URL validation
  url: (fieldName) => ({
    condition: (value) => {
      if (!value) return false;
      try {
        new URL(value);
        return false;
      } catch {
        return true;
      }
    },
    message: `${fieldName} must be a valid URL`,
    field: fieldName
  }),

  // Number validation
  min: (fieldName, min) => ({
    condition: (value) => typeof value === 'number' && value < min,
    message: `${fieldName} must be at least ${min}`,
    field: fieldName
  }),

  max: (fieldName, max) => ({
    condition: (value) => typeof value === 'number' && value > max,
    message: `${fieldName} must be no more than ${max}`,
    field: fieldName
  }),

  // Array validation
  minArrayLength: (fieldName, min) => ({
    condition: (value) => !Array.isArray(value) || value.length < min,
    message: `${fieldName} must have at least ${min} items`,
    field: fieldName
  }),

  maxArrayLength: (fieldName, max) => ({
    condition: (value) => !Array.isArray(value) || value.length > max,
    message: `${fieldName} must have no more than ${max} items`,
    field: fieldName
  }),

  // Date validation
  futureDate: (fieldName) => ({
    condition: (value) => {
      if (!value) return false;
      const date = new Date(value);
      return isNaN(date.getTime()) || date <= new Date();
    },
    message: `${fieldName} must be a future date`,
    field: fieldName
  }),

  pastDate: (fieldName) => ({
    condition: (value) => {
      if (!value) return false;
      const date = new Date(value);
      return isNaN(date.getTime()) || date >= new Date();
    },
    message: `${fieldName} must be a past date`,
    field: fieldName
  }),

  // Custom validation
  custom: (fieldName, condition, message) => ({
    condition,
    message,
    field: fieldName
  })
};

/**
 * Validate object with multiple fields
 * @param {Object} data - Object to validate
 * @param {Object} fieldRules - Object mapping field names to validation rules
 * @returns {ValidationResult} Validation result
 */
export const validateObject = (data, fieldRules) => {
  const errors = [];
  
  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const fieldValue = data[fieldName];
    const fieldValidation = validate(fieldValue, rules);
    
    if (!fieldValidation.isValid) {
      errors.push(...fieldValidation.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize input
 * @param {any} data - Data to validate and sanitize
 * @param {ValidationRule[]} rules - Validation rules
 * @returns {Object} Object with validation result and sanitized data
 */
export const validateAndSanitize = (data, rules) => {
  const validation = validate(data, rules);
  
  if (validation.isValid && typeof data === 'string') {
    return {
      ...validation,
      sanitizedData: sanitizeString(data)
    };
  }
  
  return {
    ...validation,
    sanitizedData: data
  };
}; 