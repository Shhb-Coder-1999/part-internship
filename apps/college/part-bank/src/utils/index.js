/**
 * Utility Functions for Part Bank API
 */

import { v4 as uuidv4 } from 'uuid';
import { BUSINESS_RULES, VALIDATION_RULES } from '#app/constants';

/**
 * Generate a Luhn-valid card number
 */
export function generateCardNumber() {
  // Start with prefix and random digits
  const prefix = BUSINESS_RULES.CARD_NUMBER_PREFIX;
  const digits = prefix.split('').map(Number);
  
  // Generate remaining digits (excluding checksum)
  const remainingLength = 15 - prefix.length;
  for (let i = 0; i < remainingLength; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  
  // Calculate Luhn checksum
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = digits[i];
    if ((15 - i) % 2 === 0) { // Even position from right (1-indexed)
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  // Add checksum digit
  const checksum = (10 - (sum % 10)) % 10;
  digits.push(checksum);
  
  return digits.join('');
}

/**
 * Validate Luhn algorithm for card numbers
 */
export function validateCardNumber(cardNumber) {
  if (!cardNumber || !VALIDATION_RULES.CARD_NUMBER.PATTERN.test(cardNumber)) {
    return false;
  }
  
  const digits = cardNumber.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 16; i++) {
    let digit = digits[i];
    if ((16 - i) % 2 === 0) { // Even position from right (1-indexed)
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}

/**
 * Generate upcoming instalment due date (random future date)
 */
export function generateDueDate() {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000));
  return futureDate.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Format date to YYYYMMDD format
 */
export function formatDateYYYYMMDD(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Parse YYYYMMDD date string to Date object
 */
export function parseDateYYYYMMDD(dateString) {
  if (!dateString || dateString.length !== 8) {
    return null;
  }
  
  const year = parseInt(dateString.substr(0, 4));
  const month = parseInt(dateString.substr(4, 2)) - 1; // Month is 0-indexed
  const day = parseInt(dateString.substr(6, 2));
  
  return new Date(year, month, day);
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber) {
  return VALIDATION_RULES.PHONE_NUMBER.PATTERN.test(phoneNumber);
}

/**
 * Normalize phone number (remove spaces, dashes, etc.)
 */
export function normalizePhoneNumber(phoneNumber) {
  return phoneNumber.replace(/[\s\-\(\)]/g, '');
}

/**
 * Validate name (Persian and English letters, spaces, hyphens)
 */
export function validateName(name) {
  return (
    name &&
    name.length >= VALIDATION_RULES.NAME.MIN_LENGTH &&
    name.length <= VALIDATION_RULES.NAME.MAX_LENGTH &&
    VALIDATION_RULES.NAME.PATTERN.test(name.trim())
  );
}

/**
 * Validate ID number
 */
export function validateIdNumber(idNumber) {
  return (
    idNumber &&
    idNumber.length >= VALIDATION_RULES.ID_NUMBER.MIN_LENGTH &&
    idNumber.length <= VALIDATION_RULES.ID_NUMBER.MAX_LENGTH &&
    VALIDATION_RULES.ID_NUMBER.PATTERN.test(idNumber)
  );
}

/**
 * Validate postal code
 */
export function validatePostalCode(postalCode) {
  return (
    postalCode &&
    postalCode.length >= VALIDATION_RULES.POSTAL_CODE.MIN_LENGTH &&
    postalCode.length <= VALIDATION_RULES.POSTAL_CODE.MAX_LENGTH &&
    VALIDATION_RULES.POSTAL_CODE.PATTERN.test(postalCode)
  );
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  return (
    password &&
    password.length >= VALIDATION_RULES.PASSWORD.MIN_LENGTH &&
    password.length <= VALIDATION_RULES.PASSWORD.MAX_LENGTH
  );
}

/**
 * Validate address
 */
export function validateAddress(address) {
  return (
    address &&
    address.trim().length >= VALIDATION_RULES.ADDRESS.MIN_LENGTH &&
    address.trim().length <= VALIDATION_RULES.ADDRESS.MAX_LENGTH
  );
}

/**
 * Generate random balance for demo purposes
 */
export function generateRandomBalance() {
  return Math.floor(Math.random() * 100000000) + 10000000; // 10M to 110M rials
}

/**
 * Generate random score amount
 */
export function generateRandomScoreAmount() {
  return Math.floor(Math.random() * 50000000) + 5000000; // 5M to 55M rials
}

/**
 * Generate random instalment amount
 */
export function generateRandomInstalmentAmount() {
  return Math.floor(Math.random() * 2000000) + 500000; // 500K to 2.5M rials
}

/**
 * Get random payment period
 */
export function getRandomPaymentPeriod() {
  const periods = ['TWELVE', 'TWENTY_FOUR', 'FORTY_EIGHT'];
  return periods[Math.floor(Math.random() * periods.length)];
}

/**
 * Convert payment period enum to number
 */
export function paymentPeriodToNumber(period) {
  switch (period) {
    case 'TWELVE': return 12;
    case 'TWENTY_FOUR': return 24;
    case 'FORTY_EIGHT': return 48;
    default: return 12;
  }
}

/**
 * Convert number to payment period enum
 */
export function numberToPaymentPeriod(number) {
  switch (number) {
    case 12: return 'TWELVE';
    case 24: return 'TWENTY_FOUR';
    case 48: return 'FORTY_EIGHT';
    default: return 'TWELVE';
  }
}

/**
 * Generate file ID for document storage
 */
export function generateFileId() {
  return `file_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Validate file size
 */
export function validateFileSize(size, maxSize) {
  return size <= maxSize;
}

/**
 * Validate file type
 */
export function validateFileType(mimeType, allowedTypes) {
  return allowedTypes.includes(mimeType);
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber) {
  if (!cardNumber || cardNumber.length !== 16) {
    return cardNumber;
  }
  return '*'.repeat(12) + cardNumber.slice(-4);
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(page, pageSize, totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalItems: parseInt(totalItems),
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

/**
 * Sanitize user input (trim whitespace, normalize)
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Create PRD-compliant error response with bilingual messages
 */
export function createPRDErrorResponse(code, messageEn, messageFa = null, details = null) {
  return {
    error: {
      code,
      message: messageFa ? { fa: messageFa, en: messageEn } : messageEn,
      ...(details && { details })
    }
  };
}

/**
 * Create PRD-compliant success response
 */
export function createPRDSuccessResponse(data, meta = null) {
  return {
    data,
    ...(meta && { meta })
  };
}