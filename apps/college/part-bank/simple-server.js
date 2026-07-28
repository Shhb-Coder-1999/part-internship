/**
 * Simple Part Bank API Server for Testing
 */

import Fastify from 'fastify';
import { passwordService, jwtService } from '@shared/core/auth';
import { prismaClient } from '#app/clients';

// Create Fastify instance
const fastify = Fastify({
  logger: true
});

// Register CORS
await fastify.register(import('@fastify/cors'), {
  origin: true
});

// Decorate with Prisma client
fastify.decorate('prisma', prismaClient);

// Simple authentication decorator
fastify.decorate('authenticate', async function(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header missing or invalid'
        }
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyToken(token);
    
    // Get user from database
    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.status !== 'ACTIVE') {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found or inactive'
        }
      });
    }

    request.user = user;
  } catch (error) {
    return reply.status(401).send({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
});

// Root route
fastify.get('/', async (request, reply) => {
  return {
    service: 'Part Bank API',
    version: '1.0.0',
    description: 'Minimal banking-style API',
    status: 'running'
  };
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'part-bank-api',
    version: '1.0.0'
  };
});

// Sign up endpoint
fastify.post('/api/auth/sign-up', {
  schema: {
    body: {
      type: 'object',
      required: ['firstName', 'lastName', 'idNumber', 'phoneNumber', 'password'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        idNumber: { type: 'string' },
        phoneNumber: { type: 'string' },
        password: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { firstName, lastName, idNumber, phoneNumber, password } = request.body;
    
    // Check if user exists
    const existingUser = await fastify.prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (existingUser) {
      return reply.status(409).send({
        error: {
          code: 'PHONE_EXISTS',
          message: 'Phone number already exists'
        }
      });
    }
    
    // Hash password
    const passwordHash = await passwordService.hashPassword(password);
    
    // Create user
    const user = await fastify.prisma.user.create({
      data: {
        firstName,
        lastName,
        idNumber,
        phoneNumber,
        passwordHash,
        status: 'ACTIVE'
      }
    });
    
    return reply.status(201).send({
      data: {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Login endpoint
fastify.post('/api/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['phoneNumber', 'password'],
      properties: {
        phoneNumber: { type: 'string' },
        password: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { phoneNumber, password } = request.body;
    
    // Find user
    const user = await fastify.prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (!user || user.status !== 'ACTIVE') {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }
    
    // Verify password
    const isPasswordValid = await passwordService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials'
        }
      });
    }
    
    // Generate token
    const tokenData = jwtService.createUserToken({
      id: user.id,
      email: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: ['user']
    });
    
    return reply.send({
      data: {
        token: tokenData.token,
        expiresIn: tokenData.expiresIn,
        user: {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Get user deposit accounts
fastify.get('/api/deposit-account', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, pageSize = 50 } = request.query;
    
    const skip = (page - 1) * pageSize;
    
    const [accounts, total] = await Promise.all([
      fastify.prisma.depositAccount.findMany({
        where: { userId },
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      fastify.prisma.depositAccount.count({
        where: { userId }
      })
    ]);
    
    return reply.send({
      data: accounts.map(account => ({
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
          paymentPeriod: account.scorePaymentPeriod === 'TWELVE' ? 12 : 
                        account.scorePaymentPeriod === 'TWENTY_FOUR' ? 24 : 48
        },
        upcomingInstalment: {
          amount: account.upcomingInstalmentAmount,
          dueDate: account.upcomingInstalmentDueDate
        },
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      })),
      meta: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalItems: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Get user transactions
fastify.get('/api/transactions', {
  preHandler: fastify.authenticate
}, async (request, reply) => {
  try {
    const userId = request.user.id;
    const { page = 1, pageSize = 20, type, minAmount, maxAmount } = request.query;
    
    // Get user's account IDs
    const userAccounts = await fastify.prisma.depositAccount.findMany({
      where: { userId },
      select: { id: true }
    });
    
    if (userAccounts.length === 0) {
      return reply.send({
        data: [],
        meta: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalItems: 0,
          totalPages: 0
        }
      });
    }
    
    const accountIds = userAccounts.map(acc => acc.id);
    const skip = (page - 1) * pageSize;
    
    // Build where clause
    const where = {
      accountId: { in: accountIds }
    };
    
    if (type) {
      where.type = type.toUpperCase();
    }
    
    if (minAmount !== undefined && maxAmount !== undefined) {
      where.amount = {
        gte: parseInt(minAmount),
        lte: parseInt(maxAmount)
      };
    } else if (minAmount !== undefined) {
      where.amount = { gte: parseInt(minAmount) };
    } else if (maxAmount !== undefined) {
      where.amount = { lte: parseInt(maxAmount) };
    }
    
    const [transactions, total] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        orderBy: [
          { date: 'desc' },
          { id: 'desc' }
        ]
      }),
      fastify.prisma.transaction.count({ where })
    ]);
    
    return reply.send({
      data: transactions.map(tx => ({
        transactionId: tx.id,
        accountId: tx.accountId,
        type: tx.type.toLowerCase(),
        date: tx.date.toISOString(),
        amount: tx.amount
      })),
      meta: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalItems: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Start server
try {
  await fastify.listen({ port: 3002, host: '0.0.0.0' });
  
  console.log('🚀 Part Bank API Server is running on http://localhost:3002');
  console.log('📚 API endpoints available:');
  console.log('  • GET  /              - API info');
  console.log('  • GET  /health        - Health check');
  console.log('  • POST /api/auth/sign-up    - Sign up');
  console.log('  • POST /api/auth/login      - Login');
  console.log('  • GET  /api/deposit-account - Get accounts');
  console.log('  • GET  /api/transactions    - Get transactions');
  
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}