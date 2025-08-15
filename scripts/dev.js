#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Service configuration
const services = [
  {
    name: 'Gateway API',
    cwd: join(rootDir, 'packages/gateway-api'),
    command: 'pnpm',
    args: ['dev'],
    port: 3000,
    color: '\x1b[36m', // Cyan
  },
  {
    name: 'Comments API',
    cwd: join(rootDir, 'apps/recruitment/comments'),
    command: 'pnpm',
    args: ['dev'],
    port: 3001,
    color: '\x1b[32m', // Green
  },


];

const processes = [];
const reset = '\x1b[0m';

function log(service, message, isError = false) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `${service.color}[${service.name}]${reset}`;
  const logMessage = `${timestamp} ${prefix} ${message}`;

  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
}

function startService(service) {
  return new Promise((resolve, reject) => {
    // Check if service directory exists
    if (!fs.existsSync(service.cwd)) {
      log(service, `❌ Directory not found: ${service.cwd}`, true);
      resolve();
      return;
    }

    log(service, `🚀 Starting on port ${service.port}...`);

    const process = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: 'pipe',
      shell: true,
    });

    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(service, output);
      }
    });

    process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('Warning')) {
        log(service, `⚠️  ${output}`, true);
      }
    });

    process.on('close', (code) => {
      if (code !== 0) {
        log(service, `❌ Exited with code ${code}`, true);
      } else {
        log(service, `✅ Stopped gracefully`);
      }
    });

    process.on('error', (error) => {
      log(service, `❌ Error: ${error.message}`, true);
    });

    processes.push({ service, process });

    // Give process a moment to start
    setTimeout(() => resolve(), 1000);
  });
}

async function startAllServices() {
  console.log('🔧 Part Internship Development Server');
  console.log('=====================================');
  console.log('Starting all services...\n');

  // Start all services in parallel
  await Promise.all(services.map(startService));

  console.log('\n✅ All services started!');
  console.log('\n📍 Access points:');
  console.log('🚪 API Gateway: http://localhost:3000');
  console.log('💬 Comments: http://localhost:3000/part/recruitment/comments');
  console.log('👥 Users: http://localhost:3000/part/recruitment/users');
  console.log('🏢 Sahab: http://localhost:3000/part/recruitment/sahab');
  console.log('\n📊 Individual services:');
  services.forEach((service) => {
    if (fs.existsSync(service.cwd)) {
      console.log(
        `${service.color}   ${service.name}: http://localhost:${service.port}${reset}`
      );
    }
  });
  console.log('\n🛑 Press Ctrl+C to stop all services');
}

function gracefulShutdown() {
  console.log('\n🛑 Shutting down all services...');

  processes.forEach(({ service, process }) => {
    log(service, 'Stopping...');
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    processes.forEach(({ process }) => {
      process.kill('SIGKILL');
    });
    process.exit(0);
  }, 5000);
}

// Handle graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the show
startAllServices().catch(console.error);
