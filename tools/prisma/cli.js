#!/usr/bin/env node

/**
 * Prisma Workspace CLI
 * Command-line interface for managing Prisma across the workspace
 */

import { Command } from 'commander';
import { WorkspacePrismaManager } from './studio-config.js';
import { join } from 'path';

const program = new Command();
const workspacePath = process.cwd();
const prismaManager = new WorkspacePrismaManager(workspacePath);

program
  .name('prisma-workspace')
  .description('Prisma workspace management CLI')
  .version('1.0.0');

// Studio commands
const studioCommand = program
  .command('studio')
  .description('Manage Prisma Studio instances');

studioCommand
  .command('start')
  .description('Start Prisma Studio for all services')
  .option('-s, --service <service>', 'Start studio for specific service')
  .option('-p, --port <port>', 'Specify port for studio')
  .action(async (options) => {
    try {
      if (options.service) {
        const service = prismaManager.services.find(s => s.name === options.service);
        if (!service) {
          console.error(`❌ Service '${options.service}' not found`);
          process.exit(1);
        }
        
        const port = options.port ? parseInt(options.port) : null;
        await prismaManager.studioManager.startStudio(service.path, service.name, port);
      } else {
        const results = await prismaManager.startAllStudios();
        console.log('\n📊 Studio Start Results:');
        results.forEach(result => {
          const status = result.status === 'started' ? '✅' : '❌';
          console.log(`   ${status} ${result.service}: ${result.status}`);
          if (result.url) {
            console.log(`      URL: ${result.url}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error starting studio:', error.message);
      process.exit(1);
    }
  });

studioCommand
  .command('stop')
  .description('Stop Prisma Studio instances')
  .option('-s, --service <service>', 'Stop studio for specific service')
  .action((options) => {
    try {
      if (options.service) {
        const success = prismaManager.studioManager.stopStudio(options.service);
        if (!success) {
          console.error(`❌ No active studio found for service '${options.service}'`);
          process.exit(1);
        }
      } else {
        prismaManager.studioManager.stopAllStudios();
      }
    } catch (error) {
      console.error('❌ Error stopping studio:', error.message);
      process.exit(1);
    }
  });

studioCommand
  .command('list')
  .description('List active Prisma Studio instances')
  .action(() => {
    const activeStudios = prismaManager.studioManager.listActiveStudios();
    
    if (activeStudios.length === 0) {
      console.log('📭 No active Prisma Studio instances');
      return;
    }
    
    console.log('🎨 Active Prisma Studio Instances:');
    activeStudios.forEach(studio => {
      console.log(`   📊 ${studio.serviceName}`);
      console.log(`      URL: ${studio.url}`);
      console.log(`      Started: ${studio.startTime}`);
      console.log('');
    });
  });

studioCommand
  .command('open')
  .description('Open Prisma Studio in browser')
  .requiredOption('-s, --service <service>', 'Service name')
  .action((options) => {
    try {
      const success = prismaManager.studioManager.openInBrowser(options.service);
      if (!success) {
        console.error(`❌ No active studio found for service '${options.service}'`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error opening studio:', error.message);
      process.exit(1);
    }
  });

// Database commands
const dbCommand = program
  .command('db')
  .description('Database management commands');

dbCommand
  .command('generate')
  .description('Generate Prisma clients')
  .option('-s, --service <service>', 'Generate client for specific service')
  .action(async (options) => {
    try {
      if (options.service) {
        const service = prismaManager.services.find(s => s.name === options.service);
        if (!service) {
          console.error(`❌ Service '${options.service}' not found`);
          process.exit(1);
        }
        
        await service.dbUtils.generateClient();
      } else {
        const results = await prismaManager.generateAllClients();
        console.log('\n📊 Client Generation Results:');
        results.forEach(result => {
          const status = result.status === 'success' ? '✅' : '❌';
          console.log(`   ${status} ${result.service}: ${result.status}`);
          if (result.error) {
            console.log(`      Error: ${result.error}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error generating clients:', error.message);
      process.exit(1);
    }
  });

dbCommand
  .command('push')
  .description('Push database schemas')
  .option('-s, --service <service>', 'Push schema for specific service')
  .action(async (options) => {
    try {
      if (options.service) {
        const service = prismaManager.services.find(s => s.name === options.service);
        if (!service) {
          console.error(`❌ Service '${options.service}' not found`);
          process.exit(1);
        }
        
        await service.dbUtils.pushSchema();
      } else {
        const results = await prismaManager.pushAllSchemas();
        console.log('\n📊 Schema Push Results:');
        results.forEach(result => {
          const status = result.status === 'success' ? '✅' : '❌';
          console.log(`   ${status} ${result.service}: ${result.status}`);
          if (result.error) {
            console.log(`      Error: ${result.error}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error pushing schemas:', error.message);
      process.exit(1);
    }
  });

dbCommand
  .command('seed')
  .description('Run database seeding')
  .requiredOption('-s, --service <service>', 'Service name')
  .action(async (options) => {
    try {
      const service = prismaManager.services.find(s => s.name === options.service);
      if (!service) {
        console.error(`❌ Service '${options.service}' not found`);
        process.exit(1);
      }
      
      await service.dbUtils.runSeed();
    } catch (error) {
      console.error('❌ Error running seed:', error.message);
      process.exit(1);
    }
  });

dbCommand
  .command('reset')
  .description('Reset database')
  .requiredOption('-s, --service <service>', 'Service name')
  .option('-f, --force', 'Force reset without confirmation')
  .action(async (options) => {
    try {
      const service = prismaManager.services.find(s => s.name === options.service);
      if (!service) {
        console.error(`❌ Service '${options.service}' not found`);
        process.exit(1);
      }
      
      if (!options.force) {
        const { createInterface } = await import('readline');
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question(`⚠️  Are you sure you want to reset the database for '${options.service}'? (y/N): `, resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Database reset cancelled');
          return;
        }
      }
      
      await service.dbUtils.resetDatabase();
    } catch (error) {
      console.error('❌ Error resetting database:', error.message);
      process.exit(1);
    }
  });

dbCommand
  .command('migrate')
  .description('Run database migration')
  .requiredOption('-s, --service <service>', 'Service name')
  .option('-n, --name <name>', 'Migration name')
  .action(async (options) => {
    try {
      const service = prismaManager.services.find(s => s.name === options.service);
      if (!service) {
        console.error(`❌ Service '${options.service}' not found`);
        process.exit(1);
      }
      
      await service.dbUtils.runMigration(options.name);
    } catch (error) {
      console.error('❌ Error running migration:', error.message);
      process.exit(1);
    }
  });

dbCommand
  .command('check')
  .description('Check database connections')
  .option('-s, --service <service>', 'Check specific service')
  .action(async (options) => {
    try {
      if (options.service) {
        const service = prismaManager.services.find(s => s.name === options.service);
        if (!service) {
          console.error(`❌ Service '${options.service}' not found`);
          process.exit(1);
        }
        
        const isConnected = await service.dbUtils.checkConnection();
        if (!isConnected) {
          process.exit(1);
        }
      } else {
        console.log('🔌 Checking database connections for all services...');
        
        for (const service of prismaManager.services) {
          console.log(`\n📊 Checking ${service.name}...`);
          const isConnected = await service.dbUtils.checkConnection();
          
          if (!isConnected) {
            console.log(`❌ ${service.name}: Connection failed`);
          } else {
            console.log(`✅ ${service.name}: Connection successful`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking connections:', error.message);
      process.exit(1);
    }
  });

// Services commands
program
  .command('services')
  .description('List all services with Prisma')
  .action(() => {
    const services = prismaManager.listServices();
    
    if (services.length === 0) {
      console.log('📭 No services with Prisma schemas found');
      return;
    }
    
    console.log('🔍 Services with Prisma:');
    services.forEach(service => {
      const status = service.hasSchema ? '✅' : '❌';
      console.log(`   ${status} ${service.name} (${service.category})`);
      console.log(`      Path: ${service.path}`);
      console.log('');
    });
  });

// Workspace commands
program
  .command('init')
  .description('Initialize Prisma workspace tools')
  .action(async () => {
    try {
      console.log('🚀 Initializing Prisma workspace tools...');
      
      // Generate all clients
      console.log('📦 Generating Prisma clients...');
      await prismaManager.generateAllClients();
      
      // Check all connections
      console.log('🔌 Checking database connections...');
      for (const service of prismaManager.services) {
        await service.dbUtils.checkConnection();
      }
      
      console.log('✅ Prisma workspace tools initialized successfully!');
      console.log('\n📚 Available commands:');
      console.log('   prisma-workspace studio start     - Start all Studio instances');
      console.log('   prisma-workspace db generate       - Generate all clients');
      console.log('   prisma-workspace db push          - Push all schemas');
      console.log('   prisma-workspace services         - List all services');
      
    } catch (error) {
      console.error('❌ Error initializing workspace:', error.message);
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  prismaManager.studioManager.stopAllStudios();
  process.exit(0);
});

program.parse();
