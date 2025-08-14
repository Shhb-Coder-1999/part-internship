/**
 * Prisma Studio Configuration and Utilities
 * Enhanced database management and debugging tools
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Prisma Studio Manager
 * Manages multiple Prisma Studio instances for different services
 */
export class PrismaStudioManager {
  constructor() {
    this.activeStudios = new Map();
    this.defaultPort = 5555;
  }
  
  /**
   * Start Prisma Studio for a specific service
   * @param {string} servicePath - Path to the service directory
   * @param {string} serviceName - Name of the service
   * @param {number} port - Port to run Studio on
   * @returns {Promise<Object>} Studio process info
   */
  async startStudio(servicePath, serviceName, port = null) {
    const studioPort = port || this.getNextAvailablePort();
    
    console.log(`🎨 Starting Prisma Studio for ${serviceName} on port ${studioPort}...`);
    
    // Check if Prisma schema exists
    const schemaPath = join(servicePath, 'prisma', 'schema.prisma');
    if (!existsSync(schemaPath)) {
      throw new Error(`Prisma schema not found at ${schemaPath}`);
    }
    
    // Spawn Prisma Studio process
    const studio = spawn('npx', ['prisma', 'studio', '--port', studioPort.toString()], {
      cwd: servicePath,
      stdio: 'pipe'
    });
    
    const studioInfo = {
      serviceName,
      servicePath,
      port: studioPort,
      process: studio,
      url: `http://localhost:${studioPort}`,
      startTime: new Date().toISOString()
    };
    
    // Handle studio output
    studio.stdout.on('data', (data) => {
      console.log(`[${serviceName} Studio]: ${data.toString().trim()}`);
    });
    
    studio.stderr.on('data', (data) => {
      console.error(`[${serviceName} Studio Error]: ${data.toString().trim()}`);
    });
    
    studio.on('close', (code) => {
      console.log(`🎨 Prisma Studio for ${serviceName} closed with code ${code}`);
      this.activeStudios.delete(serviceName);
    });
    
    this.activeStudios.set(serviceName, studioInfo);
    
    // Wait a moment for studio to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Prisma Studio for ${serviceName} is running at ${studioInfo.url}`);
    
    return studioInfo;
  }
  
  /**
   * Stop Prisma Studio for a specific service
   * @param {string} serviceName - Name of the service
   */
  stopStudio(serviceName) {
    const studioInfo = this.activeStudios.get(serviceName);
    
    if (!studioInfo) {
      console.log(`❌ No active studio found for ${serviceName}`);
      return false;
    }
    
    console.log(`🛑 Stopping Prisma Studio for ${serviceName}...`);
    studioInfo.process.kill();
    this.activeStudios.delete(serviceName);
    
    return true;
  }
  
  /**
   * Stop all active studios
   */
  stopAllStudios() {
    console.log('🛑 Stopping all Prisma Studios...');
    
    for (const [serviceName, studioInfo] of this.activeStudios) {
      studioInfo.process.kill();
      console.log(`   ✅ Stopped studio for ${serviceName}`);
    }
    
    this.activeStudios.clear();
  }
  
  /**
   * List all active studios
   * @returns {Array} List of active studios
   */
  listActiveStudios() {
    return Array.from(this.activeStudios.values()).map(studio => ({
      serviceName: studio.serviceName,
      url: studio.url,
      port: studio.port,
      startTime: studio.startTime
    }));
  }
  
  /**
   * Get next available port for Studio
   * @returns {number} Available port
   */
  getNextAvailablePort() {
    const usedPorts = Array.from(this.activeStudios.values()).map(studio => studio.port);
    let port = this.defaultPort;
    
    while (usedPorts.includes(port)) {
      port++;
    }
    
    return port;
  }
  
  /**
   * Open Studio URL in browser
   * @param {string} serviceName - Name of the service
   */
  openInBrowser(serviceName) {
    const studioInfo = this.activeStudios.get(serviceName);
    
    if (!studioInfo) {
      console.log(`❌ No active studio found for ${serviceName}`);
      return false;
    }
    
    const { exec } = require('child_process');
    const url = studioInfo.url;
    
    // Open URL in default browser (cross-platform)
    const command = process.platform === 'win32' ? `start ${url}` :
                   process.platform === 'darwin' ? `open ${url}` :
                   `xdg-open ${url}`;
    
    exec(command, (error) => {
      if (error) {
        console.error(`❌ Failed to open browser: ${error.message}`);
      } else {
        console.log(`🌐 Opened ${serviceName} Studio in browser: ${url}`);
      }
    });
    
    return true;
  }
}

/**
 * Prisma Database Utilities
 */
export class PrismaDbUtils {
  constructor(servicePath) {
    this.servicePath = servicePath;
    this.schemaPath = join(servicePath, 'prisma', 'schema.prisma');
  }
  
  /**
   * Generate Prisma client
   */
  async generateClient() {
    console.log(`🔄 Generating Prisma client for ${this.servicePath}...`);
    
    return new Promise((resolve, reject) => {
      const generate = spawn('npx', ['prisma', 'generate'], {
        cwd: this.servicePath,
        stdio: 'inherit'
      });
      
      generate.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Prisma client generated successfully');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });
    });
  }
  
  /**
   * Push database schema
   */
  async pushSchema() {
    console.log(`📤 Pushing database schema for ${this.servicePath}...`);
    
    return new Promise((resolve, reject) => {
      const push = spawn('npx', ['prisma', 'db', 'push'], {
        cwd: this.servicePath,
        stdio: 'inherit'
      });
      
      push.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database schema pushed successfully');
          resolve();
        } else {
          reject(new Error(`Prisma push failed with code ${code}`));
        }
      });
    });
  }
  
  /**
   * Run database seeding
   */
  async runSeed() {
    console.log(`🌱 Running database seed for ${this.servicePath}...`);
    
    return new Promise((resolve, reject) => {
      const seed = spawn('npx', ['prisma', 'db', 'seed'], {
        cwd: this.servicePath,
        stdio: 'inherit'
      });
      
      seed.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database seeded successfully');
          resolve();
        } else {
          reject(new Error(`Prisma seed failed with code ${code}`));
        }
      });
    });
  }
  
  /**
   * Reset database
   */
  async resetDatabase() {
    console.log(`🔄 Resetting database for ${this.servicePath}...`);
    
    return new Promise((resolve, reject) => {
      const reset = spawn('npx', ['prisma', 'migrate', 'reset', '--force'], {
        cwd: this.servicePath,
        stdio: 'inherit'
      });
      
      reset.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database reset successfully');
          resolve();
        } else {
          reject(new Error(`Prisma reset failed with code ${code}`));
        }
      });
    });
  }
  
  /**
   * Run database migration
   */
  async runMigration(name = null) {
    const migrationName = name || `migration_${Date.now()}`;
    console.log(`🚀 Running migration "${migrationName}" for ${this.servicePath}...`);
    
    return new Promise((resolve, reject) => {
      const migrate = spawn('npx', ['prisma', 'migrate', 'dev', '--name', migrationName], {
        cwd: this.servicePath,
        stdio: 'inherit'
      });
      
      migrate.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Migration "${migrationName}" completed successfully`);
          resolve();
        } else {
          reject(new Error(`Migration failed with code ${code}`));
        }
      });
    });
  }
  
  /**
   * Check database connection
   */
  async checkConnection() {
    console.log(`🔌 Checking database connection for ${this.servicePath}...`);
    
    try {
      // This is a simple way to check if the database is accessible
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }
}

/**
 * Workspace Prisma Manager
 * Manages Prisma operations across all services in the workspace
 */
export class WorkspacePrismaManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.studioManager = new PrismaStudioManager();
    this.services = this.discoverPrismaServices();
  }
  
  /**
   * Discover all services with Prisma schemas
   * @returns {Array} List of services with Prisma
   */
  discoverPrismaServices() {
    const services = [];
    const appsDir = join(this.workspacePath, 'apps');
    
    try {
      const categories = require('fs').readdirSync(appsDir);
      
      for (const category of categories) {
        const categoryPath = join(appsDir, category);
        const serviceNames = require('fs').readdirSync(categoryPath);
        
        for (const serviceName of serviceNames) {
          const servicePath = join(categoryPath, serviceName);
          const schemaPath = join(servicePath, 'prisma', 'schema.prisma');
          
          if (existsSync(schemaPath)) {
            services.push({
              name: serviceName,
              category,
              path: servicePath,
              schemaPath,
              dbUtils: new PrismaDbUtils(servicePath)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error discovering Prisma services:', error);
    }
    
    return services;
  }
  
  /**
   * Start Studio for all services
   */
  async startAllStudios() {
    console.log('🎨 Starting Prisma Studio for all services...');
    
    const results = [];
    
    for (const service of this.services) {
      try {
        const studioInfo = await this.studioManager.startStudio(
          service.path,
          service.name
        );
        results.push({ service: service.name, status: 'started', ...studioInfo });
      } catch (error) {
        console.error(`❌ Failed to start studio for ${service.name}:`, error.message);
        results.push({ service: service.name, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Generate clients for all services
   */
  async generateAllClients() {
    console.log('🔄 Generating Prisma clients for all services...');
    
    const results = [];
    
    for (const service of this.services) {
      try {
        await service.dbUtils.generateClient();
        results.push({ service: service.name, status: 'success' });
      } catch (error) {
        console.error(`❌ Failed to generate client for ${service.name}:`, error.message);
        results.push({ service: service.name, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Push schemas for all services
   */
  async pushAllSchemas() {
    console.log('📤 Pushing schemas for all services...');
    
    const results = [];
    
    for (const service of this.services) {
      try {
        await service.dbUtils.pushSchema();
        results.push({ service: service.name, status: 'success' });
      } catch (error) {
        console.error(`❌ Failed to push schema for ${service.name}:`, error.message);
        results.push({ service: service.name, status: 'failed', error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * List all services with Prisma
   */
  listServices() {
    return this.services.map(service => ({
      name: service.name,
      category: service.category,
      path: service.path,
      hasSchema: existsSync(service.schemaPath)
    }));
  }
}

export default {
  PrismaStudioManager,
  PrismaDbUtils,
  WorkspacePrismaManager
};
