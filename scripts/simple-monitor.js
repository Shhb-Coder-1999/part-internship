#!/usr/bin/env node

/**
 * Simple Service Monitor
 * Monitor all services with basic formatting
 */

import { spawn } from 'child_process';

const services = [
  {
    name: 'Gateway API',
    port: 3000,
    color: '\x1b[36m', // Cyan
    command: 'pnpm',
    args: ['dev'],
    cwd: 'packages/gateway-api',
  },
  {
    name: 'Comments API',
    port: 3001,
    color: '\x1b[32m', // Green
    command: 'pnpm',
    args: ['dev'],
    cwd: 'apps/recruitment/comments',
  },

  {
    name: 'Sahab API',
    port: 3003,
    color: '\x1b[35m', // Magenta
    command: 'pnpm',
    args: ['dev'],
    cwd: 'apps/recruitment/sahab',
  },
];

const reset = '\x1b[0m';

console.log('🚀 Part Internship Service Monitor');
console.log('=====================================\n');

console.log('📊 Starting all services...\n');

services.forEach((service) => {
  const { name, port, color, command, args, cwd } = service;

  console.log(`${color}🔧 Starting ${name} on port ${port}...${reset}`);

  const process = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true,
  });

  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${color}[${name}]${reset} ${output}`);
    }
  });

  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('Warning')) {
      console.log(`${color}[${name}]${reset} \x1b[31mERROR: ${output}\x1b[0m`);
    }
  });

  process.on('close', (code) => {
    if (code !== 0) {
      console.log(
        `${color}[${name}]${reset} \x1b[31m❌ Exited with code ${code}\x1b[0m`
      );
    } else {
      console.log(
        `${color}[${name}]${reset} \x1b[32m✅ Stopped gracefully\x1b[0m`
      );
    }
  });

  process.on('error', (error) => {
    console.log(
      `${color}[${name}]${reset} \x1b[31m❌ Error: ${error.message}\x1b[0m`
    );
  });
});

console.log('\n💡 Tips:');
console.log('   • Press Ctrl+C to stop all services');
console.log('   • Check individual service logs above');
console.log('   • Visit http://localhost:3000/docs for API docs');
console.log('   • Test registration: http://localhost:3000/auth/register\n');
