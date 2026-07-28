/**
 * Test Helper Functions
 */

import { jwtService, passwordService } from '../../../packages/shared/auth';
import { prismaClient } from '../../src/clients/index.js';
import { generateCardNumber, generateDueDate, generateFileId } from '../../src/utils/index.js';

/**
 * Create a test user
 */
export async function createTestUser(userData = {}) {
  const defaultUser = {
    phoneNumber: '09123456789',
    firstName: 'علی',
    lastName: 'احمدی',
    idNumber: '1234567890',
    passwordHash: await passwordService.hashPassword('password123'),
    status: 'ACTIVE'
  };

  return await prismaClient.user.create({
    data: { ...defaultUser, ...userData }
  });
}

/**
 * Create a test deposit account
 */
export async function createTestDepositAccount(userId, accountData = {}) {
  const defaultAccount = {
    userId,
    firstName: 'علی',
    lastName: 'احمدی',
    address: 'خیابان ولیعصر، پلاک ۱۲۳، تهران',
    postalCode: '1234567890',
    cardNumber: generateCardNumber(),
    balance: 50000000,
    scoreAmount: 10000000,
    scorePaymentPeriod: 'TWELVE',
    upcomingInstalmentAmount: 1000000,
    upcomingInstalmentDueDate: generateDueDate(),
    documentType: 'nationalCardImage',
    documentContentType: 'image/jpeg',
    documentSize: 123456,
    documentId: generateFileId()
  };

  return await prismaClient.depositAccount.create({
    data: { ...defaultAccount, ...accountData }
  });
}

/**
 * Create a test transaction
 */
export async function createTestTransaction(accountId, transactionData = {}) {
  const defaultTransaction = {
    accountId,
    type: 'DEPOSIT',
    amount: 1000000,
    date: new Date()
  };

  return await prismaClient.transaction.create({
    data: { ...defaultTransaction, ...transactionData }
  });
}

/**
 * Generate JWT token for testing
 */
export function generateTestToken(user) {
  return jwtService.generateToken({
    id: user.id,
    email: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: ['user']
  });
}

/**
 * Create authorization header for tests
 */
export function createAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create a complete test user with token
 */
export async function createTestUserWithToken(userData = {}) {
  const user = await createTestUser(userData);
  const token = generateTestToken(user);
  
  return {
    user,
    token,
    authHeader: createAuthHeader(token)
  };
}

/**
 * Create test file data for multipart uploads
 */
export function createTestFileData() {
  return {
    filename: 'national-card.jpg',
    mimetype: 'image/jpeg',
    size: 123456,
    buffer: Buffer.from('fake-image-data')
  };
}

/**
 * Create multipart form data for testing
 */
export function createMultipartData(fields, file) {
  const boundary = '----formdata-test-boundary';
  let body = '';
  
  // Add form fields
  for (const [key, value] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }
  
  // Add file
  if (file) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="nationalCardImage"; filename="${file.filename}"\r\n`;
    body += `Content-Type: ${file.mimetype}\r\n\r\n`;
    body += file.buffer.toString();
    body += `\r\n`;
  }
  
  body += `--${boundary}--\r\n`;
  
  return {
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    }
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  await prismaClient.transaction.deleteMany({});
  await prismaClient.depositAccount.deleteMany({});
  await prismaClient.user.deleteMany({});
}

/**
 * Wait for a promise with timeout
 */
export function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

/**
 * Validate UUID format
 */
export function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate ISO date format
 */
export function isValidISODate(str) {
  const date = new Date(str);
  return date instanceof Date && !isNaN(date) && str === date.toISOString();
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(str) {
  return /^09\d{9}$/.test(str);
}

/**
 * Validate card number format and Luhn algorithm
 */
export function isValidCardNumber(str) {
  if (!/^\d{16}$/.test(str)) return false;
  
  // Luhn algorithm validation
  const digits = str.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 16; i++) {
    let digit = digits[i];
    if ((16 - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}