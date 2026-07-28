/**
 * Database Seed Script for Part Bank API
 * Populates the database with sample data for development and testing
 */

import { PrismaClient } from '@prisma/client';
import { passwordService } from '@shared/core/auth';

const prisma = new PrismaClient();

/**
 * Generate a Luhn-valid card number
 */
function generateLuhnValidCardNumber() {
  // Start with 16 digits, last digit will be checksum
  const digits = [];
  
  // Generate first 15 digits
  for (let i = 0; i < 15; i++) {
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
 * Generate random date in YYYYMMDD format
 */
function generateRandomDueDate() {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000)); // Within next year
  return futureDate.toISOString().split('T')[0].replace(/-/g, '');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const users = [
    {
      phoneNumber: '09123456789',
      firstName: 'علی',
      lastName: 'احمدی',
      idNumber: '1234567890',
      password: 'password123'
    },
    {
      phoneNumber: '09123456788',
      firstName: 'فاطمه',
      lastName: 'محمدی',
      idNumber: '1234567891',
      password: 'password123'
    },
    {
      phoneNumber: '09123456787',
      firstName: 'حسین',
      lastName: 'رضایی',
      idNumber: '1234567892',
      password: 'password123'
    }
  ];

  console.log('👥 Creating users...');
  const createdUsers = [];
  
  for (const userData of users) {
    const hashedPassword = await passwordService.hashPassword(userData.password);
    
    const user = await prisma.user.upsert({
      where: { phoneNumber: userData.phoneNumber },
      update: {},
      create: {
        phoneNumber: userData.phoneNumber,
        firstName: userData.firstName,
        lastName: userData.lastName,
        idNumber: userData.idNumber,
        passwordHash: hashedPassword,
        status: 'ACTIVE'
      }
    });
    
    createdUsers.push(user);
    console.log(`✓ Created user: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
  }

  // Create deposit accounts for users
  console.log('🏦 Creating deposit accounts...');
  const depositAccounts = [];
  
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    
    // Create 1-2 accounts per user
    const accountCount = Math.random() > 0.5 ? 2 : 1;
    
    for (let j = 0; j < accountCount; j++) {
      const account = await prisma.depositAccount.create({
        data: {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          address: `خیابان ولیعصر، پلاک ${Math.floor(Math.random() * 999) + 1}، تهران`,
          postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
          cardNumber: generateLuhnValidCardNumber(),
          balance: Math.floor(Math.random() * 100000000) + 10000000, // 10M to 110M rials
          scoreAmount: Math.floor(Math.random() * 50000000) + 5000000, // 5M to 55M rials
          scorePaymentPeriod: ['TWELVE', 'TWENTY_FOUR', 'FORTY_EIGHT'][Math.floor(Math.random() * 3)],
          upcomingInstalmentAmount: Math.floor(Math.random() * 2000000) + 500000, // 500K to 2.5M rials
          upcomingInstalmentDueDate: generateRandomDueDate(),
          documentType: 'nationalCardImage',
          documentContentType: 'image/jpeg',
          documentSize: Math.floor(Math.random() * 2000000) + 100000, // 100KB to 2MB
          documentId: `doc_${Math.random().toString(36).substr(2, 9)}`
        }
      });
      
      depositAccounts.push(account);
      console.log(`✓ Created deposit account: ${account.cardNumber} for ${user.firstName} ${user.lastName}`);
    }
  }

  // Create sample transactions
  console.log('💳 Creating transactions...');
  
  for (const account of depositAccounts) {
    // Create 5-15 transactions per account
    const transactionCount = Math.floor(Math.random() * 11) + 5;
    
    for (let i = 0; i < transactionCount; i++) {
      const transaction = await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: Math.random() > 0.3 ? 'DEPOSIT' : 'WITHDRAW', // 70% deposits, 30% withdrawals
          amount: Math.floor(Math.random() * 10000000) + 100000, // 100K to 10M rials
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date in last year
        }
      });
      
      if (i === 0) {
        console.log(`✓ Creating ${transactionCount} transactions for account ${account.cardNumber}`);
      }
    }
  }

  console.log('✅ Database seed completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   • ${createdUsers.length} users created`);
  console.log(`   • ${depositAccounts.length} deposit accounts created`);
  
  const totalTransactions = await prisma.transaction.count();
  console.log(`   • ${totalTransactions} transactions created`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });