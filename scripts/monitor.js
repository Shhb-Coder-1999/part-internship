#!/usr/bin/env node

/**
 * Service Monitor Script
 * Monitor all services in one terminal with better formatting
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import boxen from 'boxen';

const services = [
  {
    name: 'Gateway API',
    port: 3000,
    color: chalk.cyan,
    command: 'pnpm',
    args: ['dev'],
    cwd: 'packages/gateway-api',
  },
  {
    name: 'Comments API',
    port: 3001,
    color: chalk.green,
    command: 'pnpm',
    args: ['dev'],
    cwd: 'apps/recruitment/comments',
  },
  {
    name: 'User Management',
    port: 3002,
    color: chalk.yellow,
    command: 'pnpm',
    args: ['dev'],
    cwd: 'apps/recruitment/user-management',
  },
  {
    name: 'Sahab API',
    port: 3003,
    color: chalk.magenta,
    command: 'pnpm',
    args: ['dev'],
    cwd: 'apps/recruitment/sahab',
  },
];

console.log(
  boxen('🚀 Part Internship Service Monitor', {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
    backgroundColor: '#000',
  })
);

console.log(chalk.blue('📊 Monitoring all services...\n'));

services.forEach((service) => {
  const { name, port, color, command, args, cwd } = service;

  console.log(color(`🔧 Starting ${name} on port ${port}...`));

  const process = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: true,
  });

  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(color(`[${name}] ${output}`));
    }
  });

  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('Warning')) {
      console.log(chalk.red(`[${name}] ERROR: ${output}`));
    }
  });

  process.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`[${name}] ❌ Exited with code ${code}`));
    } else {
      console.log(chalk.green(`[${name}] ✅ Stopped gracefully`));
    }
  });

  process.on('error', (error) => {
    console.log(chalk.red(`[${name}] ❌ Error: ${error.message}`));
  });
});

// Health check function
async function checkHealth() {
  console.log(chalk.blue('\n🏥 Health Check Status:'));

  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        console.log(
          chalk.green(`✅ ${service.name} (${service.port}): HEALTHY`)
        );
      } else {
        console.log(
          chalk.yellow(`⚠️ ${service.name} (${service.port}): UNHEALTHY`)
        );
      }
    } catch (error) {
      console.log(
        chalk.red(`❌ ${service.name} (${service.port}): UNREACHABLE`)
      );
    }
  }
}

// Run health check every 30 seconds
setInterval(checkHealth, 30000);

// Initial health check after 10 seconds
setTimeout(checkHealth, 10000);

console.log(chalk.yellow('\n💡 Tips:'));
console.log(chalk.yellow('   • Press Ctrl+C to stop all services'));
console.log(chalk.yellow('   • Health checks run every 30 seconds'));
console.log(chalk.yellow('   • Check individual service logs above'));
console.log(
  chalk.yellow('   • Visit http://localhost:3000/docs for API docs\n')
);
