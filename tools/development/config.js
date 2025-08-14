/**
 * Development Configuration
 * Enhanced development experience setup
 */

import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Development Environment Manager
 */
export class DevEnvironmentManager {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.configPath = join(workspacePath, '.devconfig.json');
  }
  
  /**
   * Initialize development environment
   */
  async initialize() {
    console.log('🛠️  Initializing development environment...');
    
    const config = await this.createDevConfig();
    await this.setupVSCodeWorkspace();
    await this.setupGitHooks();
    await this.setupEnvironmentFiles();
    
    console.log('✅ Development environment initialized!');
    return config;
  }
  
  /**
   * Create development configuration
   */
  async createDevConfig() {
    const config = {
      workspace: {
        name: 'part-internship',
        type: 'monorepo',
        packageManager: 'pnpm'
      },
      development: {
        hotReload: true,
        watchMode: true,
        autoRestart: true,
        openBrowser: false,
        parallelBuilds: true
      },
      services: this.discoverServices(),
      tools: {
        prismaStudio: {
          autoStart: false,
          startPort: 5555
        },
        testing: {
          watchMode: true,
          coverage: true,
          parallel: true
        },
        linting: {
          autoFix: true,
          preCommit: true
        }
      },
      ports: this.assignPorts(),
      environment: 'development',
      lastUpdated: new Date().toISOString()
    };
    
    this.saveConfig(config);
    return config;
  }
  
  /**
   * Discover all services in the workspace
   */
  discoverServices() {
    const services = [];
    const appsDir = join(this.workspacePath, 'apps');
    
    if (!existsSync(appsDir)) {
      return services;
    }
    
    try {
      const categories = require('fs').readdirSync(appsDir);
      
      for (const category of categories) {
        const categoryPath = join(appsDir, category);
        const serviceNames = require('fs').readdirSync(categoryPath);
        
        for (const serviceName of serviceNames) {
          const servicePath = join(categoryPath, serviceName);
          const packageJsonPath = join(servicePath, 'package.json');
          
          if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            
            services.push({
              name: serviceName,
              category,
              path: servicePath,
              type: packageJson.type || 'commonjs',
              scripts: Object.keys(packageJson.scripts || {}),
              dependencies: Object.keys(packageJson.dependencies || {}),
              hasPrisma: existsSync(join(servicePath, 'prisma')),
              hasTests: existsSync(join(servicePath, 'tests')) || existsSync(join(servicePath, '__tests__')),
              hasDocker: existsSync(join(servicePath, 'Dockerfile'))
            });
          }
        }
      }
    } catch (error) {
      console.error('Error discovering services:', error);
    }
    
    return services;
  }
  
  /**
   * Assign ports to services
   */
  assignPorts() {
    const services = this.discoverServices();
    const ports = {};
    let startPort = 3000;
    
    // Assign main service ports
    services.forEach(service => {
      ports[service.name] = startPort++;
    });
    
    // Assign tool ports
    ports.gateway = 8080;
    ports.prismaStudio = 5555;
    ports.webpack = 8081;
    ports.storybook = 6006;
    
    return ports;
  }
  
  /**
   * Setup VS Code workspace configuration
   */
  async setupVSCodeWorkspace() {
    const vscodeDir = join(this.workspacePath, '.vscode');
    
    if (!existsSync(vscodeDir)) {
      require('fs').mkdirSync(vscodeDir, { recursive: true });
    }
    
    // Settings
    const settings = {
      "editor.formatOnSave": true,
      "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true,
        "source.organizeImports": true
      },
      "editor.tabSize": 2,
      "editor.insertSpaces": true,
      "editor.detectIndentation": false,
      "files.eol": "\n",
      "files.trimTrailingWhitespace": true,
      "files.insertFinalNewline": true,
      "typescript.preferences.importModuleSpecifier": "relative",
      "javascript.preferences.importModuleSpecifier": "relative",
      "eslint.workingDirectories": ["apps/*/*", "packages/*"],
      "prettier.requireConfig": true,
      "npm.packageManager": "pnpm",
      "typescript.enablePromptUseWorkspaceTsdk": true
    };
    
    writeFileSync(
      join(vscodeDir, 'settings.json'),
      JSON.stringify(settings, null, 2)
    );
    
    // Extensions
    const extensions = {
      "recommendations": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json",
        "christian-kohler.path-intellisense",
        "formulahendry.auto-rename-tag",
        "ms-vscode.vscode-todo-highlight",
        "gruntfuggly.todo-tree",
        "ms-vscode.vscode-node-azure-pack",
        "prisma.prisma",
        "ms-vscode.vscode-docker"
      ]
    };
    
    writeFileSync(
      join(vscodeDir, 'extensions.json'),
      JSON.stringify(extensions, null, 2)
    );
    
    // Tasks
    const tasks = {
      "version": "2.0.0",
      "tasks": [
        {
          "label": "Start Development",
          "type": "shell",
          "command": "pnpm dev:parallel",
          "group": "build",
          "presentation": {
            "echo": true,
            "reveal": "always",
            "focus": false,
            "panel": "new",
            "showReuseMessage": true,
            "clear": false
          },
          "problemMatcher": []
        },
        {
          "label": "Run Tests",
          "type": "shell",
          "command": "pnpm test",
          "group": "test",
          "presentation": {
            "echo": true,
            "reveal": "always",
            "focus": false,
            "panel": "new"
          }
        },
        {
          "label": "Generate Service",
          "type": "shell",
          "command": "pnpm generate:service",
          "group": "build"
        },
        {
          "label": "Start Prisma Studio",
          "type": "shell",
          "command": "pnpm prisma:studio",
          "group": "build"
        }
      ]
    };
    
    writeFileSync(
      join(vscodeDir, 'tasks.json'),
      JSON.stringify(tasks, null, 2)
    );
    
    // Launch configurations
    const launch = {
      "version": "0.2.0",
      "configurations": [
        {
          "name": "Debug Comments Service",
          "type": "node",
          "request": "launch",
          "program": "${workspaceFolder}/apps/recruitment/comments/server.js",
          "env": {
            "NODE_ENV": "development"
          },
          "console": "integratedTerminal",
          "restart": true,
          "runtimeArgs": ["--loader", "@swc-node/register"]
        },
        {
          "name": "Debug Gateway",
          "type": "node",
          "request": "launch",
          "program": "${workspaceFolder}/packages/gateway-api/index.js",
          "env": {
            "NODE_ENV": "development"
          },
          "console": "integratedTerminal"
        }
      ]
    };
    
    writeFileSync(
      join(vscodeDir, 'launch.json'),
      JSON.stringify(launch, null, 2)
    );
    
    console.log('✅ VS Code workspace configured');
  }
  
  /**
   * Setup Git hooks
   */
  async setupGitHooks() {
    const huskyDir = join(this.workspacePath, '.husky');
    
    if (!existsSync(huskyDir)) {
      require('fs').mkdirSync(huskyDir, { recursive: true });
    }
    
    // Pre-commit hook
    const preCommit = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint and format staged files
npx lint-staged

# Run type checking
echo "🔍 Type checking..."
pnpm run --filter "@shared/core" type-check

echo "✅ Pre-commit checks passed!"
`;
    
    writeFileSync(join(huskyDir, 'pre-commit'), preCommit);
    
    // Pre-push hook
    const prePush = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 Running tests before push..."

# Run all tests
pnpm test

echo "✅ All tests passed!"
`;
    
    writeFileSync(join(huskyDir, 'pre-push'), prePush);
    
    console.log('✅ Git hooks configured');
  }
  
  /**
   * Setup environment files for all services
   */
  async setupEnvironmentFiles() {
    const services = this.discoverServices();
    const ports = this.assignPorts();
    
    for (const service of services) {
      const envDir = join(service.path, 'envs');
      const envFile = join(envDir, '.env');
      const envExampleFile = join(envDir, '.env.example');
      
      if (!existsSync(envDir)) {
        require('fs').mkdirSync(envDir, { recursive: true });
      }
      
      // Create .env if it doesn't exist
      if (!existsSync(envFile) && existsSync(envExampleFile)) {
        const envExample = readFileSync(envExampleFile, 'utf8');
        const envContent = envExample.replace(/PORT=\d+/, `PORT=${ports[service.name]}`);
        writeFileSync(envFile, envContent);
        console.log(`✅ Created .env for ${service.name}`);
      }
    }
  }
  
  /**
   * Save configuration to file
   */
  saveConfig(config) {
    writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }
  
  /**
   * Load configuration from file
   */
  loadConfig() {
    if (existsSync(this.configPath)) {
      return JSON.parse(readFileSync(this.configPath, 'utf8'));
    }
    return null;
  }
  
  /**
   * Get service development URLs
   */
  getServiceUrls() {
    const config = this.loadConfig();
    if (!config) return {};
    
    const urls = {};
    
    config.services.forEach(service => {
      const port = config.ports[service.name];
      urls[service.name] = `http://localhost:${port}`;
    });
    
    return urls;
  }
  
  /**
   * Print development information
   */
  printDevInfo() {
    const config = this.loadConfig();
    if (!config) {
      console.log('❌ No development configuration found. Run setup first.');
      return;
    }
    
    console.log('\n🛠️  Development Environment Information');
    console.log('=========================================\n');
    
    console.log('📦 Services:');
    config.services.forEach(service => {
      const port = config.ports[service.name];
      const url = `http://localhost:${port}`;
      console.log(`   📊 ${service.name} (${service.category})`);
      console.log(`      URL: ${url}`);
      console.log(`      Path: ${service.path}`);
      if (service.hasPrisma) console.log('      🗄️  Has Prisma');
      if (service.hasTests) console.log('      🧪 Has Tests');
      if (service.hasDocker) console.log('      🐳 Has Docker');
      console.log('');
    });
    
    console.log('🔧 Available Commands:');
    console.log('   pnpm dev:parallel      - Start all services');
    console.log('   pnpm generate         - Code generation menu');
    console.log('   pnpm prisma:studio    - Start Prisma Studio');
    console.log('   pnpm test             - Run all tests');
    console.log('   pnpm test:performance - Run performance tests');
    console.log('');
    
    console.log('🎨 Tools:');
    console.log(`   Gateway: http://localhost:${config.ports.gateway}`);
    console.log(`   Prisma Studio: http://localhost:${config.ports.prismaStudio}`);
    console.log('');
  }
}

export default DevEnvironmentManager;
