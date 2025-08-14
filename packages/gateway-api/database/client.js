/**
 * Gateway Database Client
 * Manages Prisma connection for authentication and user management
 */

import { PrismaClient } from '@prisma/client';

class DatabaseClient {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'colorless',
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await this.disconnect();
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
    });
  }

  /**
   * Get Prisma client instance
   */
  getClient() {
    return this.prisma;
  }

  /**
   * Connect to database
   */
  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Gateway database connected successfully');
    } catch (error) {
      console.error('❌ Gateway database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      console.log('👋 Gateway database disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting from gateway database:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      };
    }
  }

  /**
   * Get database info
   */
  async getDatabaseInfo() {
    try {
      const userCount = await this.prisma.user.count();
      const roleCount = await this.prisma.role.count();
      const permissionCount = await this.prisma.permission.count();
      const refreshTokenCount = await this.prisma.refreshToken.count({ 
        where: { isRevoked: false } 
      });

      return {
        users: userCount,
        roles: roleCount,
        permissions: permissionCount,
        activeRefreshTokens: refreshTokenCount,
        connection: 'active',
      };
    } catch (error) {
      throw new Error(`Failed to get database info: ${error.message}`);
    }
  }
}

// Export singleton instance
export const db = new DatabaseClient();
export default db;