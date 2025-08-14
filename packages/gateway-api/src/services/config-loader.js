import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { HTTP_STATUS, USER_ROLES, PERMISSIONS } from '@shared/core/constants';
import { createEnvLoader } from '@shared/core/utils/env.utils';
import { serviceRegistry } from './service-registry.js';

/**
 * Configuration Loader for Dynamic Service Discovery
 * Loads service configurations from various sources
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export class ConfigLoader {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.servicesConfigPath = join(rootPath, 'services.config.js');
    this.appsPath = join(rootPath, 'apps');
  }

  /**
   * Load all service configurations
   */
  async loadAllConfigurations() {
    const configurations = [];

    // Load from main services config if exists
    if (existsSync(this.servicesConfigPath)) {
      const mainConfig = await this.loadMainConfiguration();
      if (mainConfig) {
        configurations.push(...mainConfig);
      }
    }

    // Auto-discover services from apps directory
    const autoDiscovered = await this.autoDiscoverServices();
    configurations.push(...autoDiscovered);

    return configurations;
  }

  /**
   * Load main services configuration file
   */
  async loadMainConfiguration() {
    try {
      const configModule = await import(this.servicesConfigPath);
      const config = configModule.default || configModule;

      if (Array.isArray(config)) {
        return config;
      }

      if (typeof config === 'object' && config.services) {
        return config.services;
      }

      return [config];
    } catch (error) {
      console.warn(`Could not load main configuration: ${error.message}`);
      return [];
    }
  }

  /**
   * Auto-discover services from apps directory
   */
  async autoDiscoverServices() {
    const services = [];

    try {
      const { readdirSync, statSync } = await import('fs');
      const appDirs = readdirSync(this.appsPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const appDir of appDirs) {
        const appPath = join(this.appsPath, appDir);
        const appServices = await this.discoverServicesInApp(appPath, appDir);
        services.push(...appServices);
      }
    } catch (error) {
      console.warn(`Error auto-discovering services: ${error.message}`);
    }

    return services;
  }

  /**
   * Discover services within an app directory
   */
  async discoverServicesInApp(appPath, appName) {
    const services = [];

    try {
      const { readdirSync } = await import('fs');
      const serviceDirs = readdirSync(appPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const serviceDir of serviceDirs) {
        const servicePath = join(appPath, serviceDir);
        const service = await this.loadServiceConfiguration(
          servicePath,
          appName,
          serviceDir
        );

        if (service) {
          services.push(service);
        }
      }
    } catch (error) {
      console.warn(
        `Error discovering services in ${appName}: ${error.message}`
      );
    }

    return services;
  }

  /**
   * Load configuration for a specific service
   */
  async loadServiceConfiguration(servicePath, appName, serviceName) {
    const configFiles = ['service.config.js', 'gateway.config.js', 'config.js'];

    let config = null;

    // Try to load from config files
    for (const configFile of configFiles) {
      const configPath = join(servicePath, configFile);

      if (existsSync(configPath)) {
        try {
          const configModule = await import(configPath);
          config = configModule.default || configModule;
          break;
        } catch (error) {
          console.warn(
            `Error loading config from ${configPath}: ${error.message}`
          );
        }
      }
    }

    // If no config file found, try to infer from package.json and environment
    if (!config) {
      config = await this.inferServiceConfiguration(
        servicePath,
        appName,
        serviceName
      );
    }

    if (!config) {
      return null;
    }

    // Process and validate configuration
    return this.processServiceConfiguration(
      config,
      servicePath,
      appName,
      serviceName
    );
  }

  /**
   * Infer service configuration from package.json and environment
   */
  async inferServiceConfiguration(servicePath, appName, serviceName) {
    const packageJsonPath = join(servicePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const envLoader = createEnvLoader(join(servicePath, 'envs'));

      // Infer basic configuration
      const port = envLoader.get('PORT', 3000, 'number');
      const host = envLoader.get('HOST', 'localhost');

      return {
        name: packageJson.name || `${appName}-${serviceName}`,
        baseUrl: `http://${host}:${port}`,
        basePath: `/part/${appName}/${serviceName}`,
        description: packageJson.description,
        version: packageJson.version,
        metadata: {
          type: appName,
          category: serviceName,
          inferredFromPackageJson: true,
        },
        // Default routes - services can override this
        routes: [
          {
            path: `/part/${appName}/${serviceName}/*`,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            requireAuth: true,
            requireRoles: [USER_ROLES.USER, USER_ROLES.ADMIN],
            methodConfigs: {
              GET: { requireAuth: false }, // Public read by default
              POST: { requireAuth: true },
              PUT: { requireAuth: true },
              DELETE: { requireAuth: true, requireRoles: [USER_ROLES.ADMIN] },
            },
          },
        ],
      };
    } catch (error) {
      console.warn(
        `Error inferring config for ${serviceName}: ${error.message}`
      );
      return null;
    }
  }

  /**
   * Process and validate service configuration
   */
  processServiceConfiguration(config, servicePath, appName, serviceName) {
    // Ensure required fields
    config.name = config.name || `${appName}-${serviceName}`;
    config.metadata = config.metadata || {};
    config.metadata.type = config.metadata.type || appName;
    config.metadata.category = config.metadata.category || serviceName;
    config.metadata.servicePath = servicePath;

    // Load environment variables for this service
    const envLoader = createEnvLoader(join(servicePath, 'envs'));

    // Override config with environment variables if present
    if (envLoader.has('SERVICE_BASE_URL')) {
      config.baseUrl = envLoader.get('SERVICE_BASE_URL');
    }

    if (envLoader.has('SERVICE_BASE_PATH')) {
      config.basePath = envLoader.get('SERVICE_BASE_PATH');
    }

    if (envLoader.has('SERVICE_REQUIRE_AUTH')) {
      config.authentication = config.authentication || {};
      config.authentication.requireAuth = envLoader.get(
        'SERVICE_REQUIRE_AUTH',
        false,
        'boolean'
      );
    }

    // Validate configuration
    this.validateServiceConfiguration(config);

    return config;
  }

  /**
   * Validate service configuration
   */
  validateServiceConfiguration(config) {
    if (!config.name) {
      throw new Error('Service configuration must have a name');
    }

    if (!config.baseUrl) {
      throw new Error(`Service ${config.name} must have a baseUrl`);
    }

    if (!config.basePath) {
      throw new Error(`Service ${config.name} must have a basePath`);
    }

    // Validate routes if present
    if (config.routes) {
      for (const route of config.routes) {
        if (!route.path) {
          throw new Error(`Service ${config.name} route must have a path`);
        }

        if (!route.methods || !Array.isArray(route.methods)) {
          throw new Error(
            `Service ${config.name} route ${route.path} must have methods array`
          );
        }
      }
    }
  }

  /**
   * Register all discovered services
   */
  async discoverAndRegisterServices() {
    console.log('🔍 Discovering services...');

    const configurations = await this.loadAllConfigurations();
    const registeredServices = [];

    for (const config of configurations) {
      try {
        const service = serviceRegistry.registerService(config);
        registeredServices.push(service);
      } catch (error) {
        console.error(
          `Failed to register service ${config.name}:`,
          error.message
        );
      }
    }

    console.log(`✅ Registered ${registeredServices.length} services`);
    return registeredServices;
  }
}

export default ConfigLoader;
