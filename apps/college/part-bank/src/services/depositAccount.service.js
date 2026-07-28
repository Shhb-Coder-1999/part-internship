/**
 * Deposit Account Service - Business logic for deposit accounts
 */

import { ValidationError, NotFoundError, BusinessLogicError } from '@shared/core/utils';
import { DepositAccountRepository } from '#app/repositories';
import { 
  validateName, 
  validateAddress, 
  validatePostalCode,
  validateFileSize,
  validateFileType,
  generateCardNumber,
  generateRandomBalance,
  generateRandomScoreAmount,
  generateRandomInstalmentAmount,
  getRandomPaymentPeriod,
  generateDueDate,
  generateFileId,
  sanitizeInput,
  paymentPeriodToNumber,
  calculatePaginationMeta
} from '#app/utils';
import { API_MESSAGES, FILE_UPLOAD, DEFAULTS } from '#app/constants';

export class DepositAccountService {
  constructor() {
    this.accountRepository = DepositAccountRepository;
  }

  /**
   * Create a new deposit account
   */
  async createAccount(userId, accountData, fileData) {
    // Validate form data
    const validation = this.validateAccountData(accountData);
    if (!validation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, validation.errors);
    }

    // Validate file
    const fileValidation = this.validateFile(fileData);
    if (!fileValidation.isValid) {
      throw new ValidationError(API_MESSAGES.ERROR.VALIDATION_FAILED, fileValidation.errors);
    }

    // Normalize and sanitize data
    const normalizedData = {
      firstName: sanitizeInput(accountData.firstName),
      lastName: sanitizeInput(accountData.lastName),
      address: sanitizeInput(accountData.address),
      postalCode: accountData.postalCode.trim()
    };

    // Generate unique card number
    let cardNumber;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      cardNumber = generateCardNumber();
      const exists = await this.accountRepository.cardNumberExists(cardNumber);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new BusinessLogicError('Unable to generate unique card number. Please try again.');
    }

    // Generate business data (in a real system, these would be calculated based on business rules)
    const balance = generateRandomBalance();
    const scoreAmount = generateRandomScoreAmount();
    const scorePaymentPeriod = getRandomPaymentPeriod();
    const upcomingInstalmentAmount = generateRandomInstalmentAmount();
    const upcomingInstalmentDueDate = generateDueDate();

    // Generate file ID (in a real system, you would store the file and return its ID)
    const documentId = generateFileId();

    // Create account
    const account = await this.accountRepository.createAccount({
      userId,
      ...normalizedData,
      cardNumber,
      balance,
      scoreAmount,
      scorePaymentPeriod,
      upcomingInstalmentAmount,
      upcomingInstalmentDueDate,
      documentType: 'nationalCardImage',
      documentContentType: fileData.mimetype,
      documentSize: fileData.size,
      documentId
    });

    // Return formatted response
    return this.formatAccountResponse(account);
  }

  /**
   * Get user's deposit accounts with pagination
   */
  async getUserAccounts(userId, page = 1, pageSize = 50) {
    const { accounts, total } = await this.accountRepository.findByUserId(userId, page, pageSize);
    
    const formattedAccounts = accounts.map(account => this.formatAccountResponse(account, false));
    const paginationMeta = calculatePaginationMeta(page, pageSize, total);

    return {
      accounts: formattedAccounts,
      meta: paginationMeta
    };
  }

  /**
   * Delete a specific deposit account
   */
  async deleteAccount(userId, accountId) {
    // Verify account exists and belongs to user
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError(API_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
    }

    // Delete account
    await this.accountRepository.deleteByIdAndUserId(accountId, userId);
    
    return { success: true };
  }

  /**
   * Delete all deposit accounts for a user
   */
  async deleteAllAccounts(userId) {
    const deletedCount = await this.accountRepository.deleteAllByUserId(userId);
    
    return { 
      success: true, 
      deletedCount 
    };
  }

  /**
   * Get account by ID (for user verification)
   */
  async getAccountById(accountId, userId) {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError(API_MESSAGES.ERROR.ACCOUNT_NOT_FOUND);
    }

    return this.formatAccountResponse(account);
  }

  /**
   * Update account balance (for transaction processing)
   */
  async updateAccountBalance(accountId, newBalance) {
    if (newBalance < 0) {
      throw new ValidationError('Account balance cannot be negative');
    }

    const updatedAccount = await this.accountRepository.updateBalance(accountId, newBalance);
    return updatedAccount;
  }

  /**
   * Get user account statistics
   */
  async getUserAccountStats(userId) {
    return await this.accountRepository.getUserAccountStats(userId);
  }

  /**
   * Validate account data
   */
  validateAccountData(data) {
    const errors = [];

    if (!validateName(data.firstName)) {
      errors.push({
        field: 'firstName',
        message: {
          fa: 'نام باید بین ۱ تا ۱۰۰ کاراکتر باشد و فقط شامل حروف، فاصله و خط تیره باشد',
          en: 'First name must be 1-100 characters and contain only letters, spaces, and hyphens'
        }
      });
    }

    if (!validateName(data.lastName)) {
      errors.push({
        field: 'lastName',
        message: {
          fa: 'نام خانوادگی باید بین ۱ تا ۱۰۰ کاراکتر باشد و فقط شامل حروف، فاصله و خط تیره باشد',
          en: 'Last name must be 1-100 characters and contain only letters, spaces, and hyphens'
        }
      });
    }

    if (!validateAddress(data.address)) {
      errors.push({
        field: 'address',
        message: {
          fa: 'آدرس باید بین ۱ تا ۳۰۰ کاراکتر باشد',
          en: 'Address must be 1-300 characters'
        }
      });
    }

    if (!validatePostalCode(data.postalCode)) {
      errors.push({
        field: 'postalCode',
        message: {
          fa: 'کد پستی باید بین ۵ تا ۱۲ رقم باشد',
          en: 'Postal code must be 5-12 digits'
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate uploaded file
   */
  validateFile(fileData) {
    const errors = [];

    if (!fileData) {
      errors.push({
        field: 'nationalCardImage',
        message: {
          fa: 'تصویر کارت ملی الزامی است',
          en: 'National card image is required'
        }
      });
      return { isValid: false, errors };
    }

    // Check file size
    if (!validateFileSize(fileData.size, FILE_UPLOAD.MAX_SIZE)) {
      errors.push({
        field: 'nationalCardImage',
        message: {
          fa: 'حجم فایل نباید بیش از ۵ مگابایت باشد',
          en: 'File size must not exceed 5MB'
        }
      });
    }

    // Check file type
    if (!validateFileType(fileData.mimetype, FILE_UPLOAD.ALLOWED_TYPES)) {
      errors.push({
        field: 'nationalCardImage',
        message: {
          fa: 'فقط فایل‌های JPEG و PNG مجاز هستند',
          en: 'Only JPEG and PNG files are allowed'
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format account response according to PRD specification
   */
  formatAccountResponse(account, includeDocument = true) {
    const response = {
      accountId: account.id,
      userId: account.userId,
      firstName: account.firstName,
      lastName: account.lastName,
      address: account.address,
      postalCode: account.postalCode,
      cardNumber: account.cardNumber,
      balance: account.balance,
      score: {
        amount: account.scoreAmount,
        paymentPeriod: paymentPeriodToNumber(account.scorePaymentPeriod)
      },
      upcomingInstalment: {
        amount: account.upcomingInstalmentAmount,
        dueDate: account.upcomingInstalmentDueDate
      },
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };

    if (includeDocument && account.documentId) {
      response.document = {
        type: account.documentType,
        contentType: account.documentContentType,
        size: account.documentSize,
        id: account.documentId
      };
    }

    return response;
  }

  /**
   * Get accounts with upcoming instalments (admin/system function)
   */
  async getAccountsWithUpcomingInstalments() {
    return await this.accountRepository.findAccountsWithUpcomingInstalments();
  }

  /**
   * Update upcoming instalment (admin/system function)
   */
  async updateUpcomingInstalment(accountId, amount, dueDate) {
    if (amount < 0) {
      throw new ValidationError('Instalment amount cannot be negative');
    }

    return await this.accountRepository.updateUpcomingInstalment(accountId, amount, dueDate);
  }
}

export default new DepositAccountService();