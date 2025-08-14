import { HTTP_STATUS, USER_ROLES, PERMISSIONS } from '@shared/core/constants';
import { createEnvLoader } from '@shared/core/utils/env.utils';

/**
 * Generic Service Registry for Dynamic Service Registration
 * Services register themselves with their own configuration
 */
export class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.routes = new Map();
    this.healthChecks = new Map();
  }

  /**
   * Register a service with its configuration
   */
  registerService(serviceConfig) {
    const {
      name,
      baseUrl,
      basePath,
      healthCheckPath = '/health',
      timeout = 30000,
      routes = [],
      authentication = {},
      metadata = {},
    } = serviceConfig;

    if (!name || !baseUrl || !basePath) {
      throw new Error(
        'Service registration requires name, baseUrl, and basePath'
      );
    }

    // Validate routes configuration
    this.validateRoutes(routes);

    const service = {
      name,
      baseUrl,
      basePath,
      healthCheckPath,
      timeout,
      routes,
      authentication,
      metadata,
      registeredAt: new Date(),
      lastHealthCheck: null,
      isHealthy: true,
    };

    this.services.set(name, service);

    // Register routes
    this.registerServiceRoutes(name, routes);

    console.log(`🔗 Service registered: ${name} at ${basePath}`);
    return service;
  }

  /**
   * Register routes for a service
   */
  registerServiceRoutes(serviceName, routes) {
    for (const route of routes) {
      const fullPath = route.path;

      if (this.routes.has(fullPath)) {
        console.warn(
          `⚠️  Route ${fullPath} already registered, overwriting...`
        );
      }

      this.routes.set(fullPath, {
        serviceName,
        ...route,
      });
    }
  }

  /**
   * Validate route configuration
   */
  validateRoutes(routes) {
    for (const route of routes) {
      if (!route.path || !route.methods) {
        throw new Error('Route must have path and methods');
      }

      if (!Array.isArray(route.methods)) {
        throw new Error('Route methods must be an array');
      }

      // Validate method configurations
      for (const [method, config] of Object.entries(
        route.methodConfigs || {}
      )) {
        if (config.requireRoles && !Array.isArray(config.requireRoles)) {
          throw new Error(
            `Route ${route.path} method ${method} requireRoles must be an array`
          );
        }
      }
    }
  }

  /**
   * Get service configuration by name
   */
  getService(name) {
    return this.services.get(name);
  }

  /**
   * Get route configuration by path
   */
  getRoute(path) {
    // Try exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Try prefix matching for wildcard routes
    for (const [routePath, config] of this.routes.entries()) {
      if (routePath.endsWith('/*') && path.startsWith(routePath.slice(0, -2))) {
        return config;
      }

      // Try pattern matching
      if (this.matchesPattern(path, routePath)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Check if path matches a route pattern
   */
  matchesPattern(path, pattern) {
    // Convert pattern to regex (simple implementation)
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get authentication requirements for a route
   */
  getRouteAuth(path, method = 'GET') {
    const route = this.getRoute(path);

    if (!route) {
      return {
        requireAuth: false,
        requireRoles: [],
        isPublic: true,
      };
    }

    const service = this.getService(route.serviceName);

    // Check method-specific configuration
    const methodConfig = route.methodConfigs?.[method] || {};

    // Merge service-level and route-level authentication
    const authConfig = {
      requireAuth:
        methodConfig.requireAuth ??
        route.requireAuth ??
        service?.authentication?.requireAuth ??
        false,
      requireRoles:
        methodConfig.requireRoles ??
        route.requireRoles ??
        service?.authentication?.requireRoles ??
        [],
      isPublic: methodConfig.isPublic ?? route.isPublic ?? false,
    };

    return authConfig;
  }

  /**
   * Get all registered services
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Get all registered routes
   */
  getAllRoutes() {
    return Array.from(this.routes.values());
  }

  /**
   * Unregister a service
   */
  unregisterService(name) {
    const service = this.services.get(name);

    if (!service) {
      return false;
    }

    // Remove service routes
    for (const [path, route] of this.routes.entries()) {
      if (route.serviceName === name) {
        this.routes.delete(path);
      }
    }

    this.services.delete(name);
    console.log(`🔌 Service unregistered: ${name}`);
    return true;
  }

  /**
   * Health check for all services
   */
  async healthCheckAll() {
    const results = new Map();

    for (const [name, service] of this.services.entries()) {
      try {
        const isHealthy = await this.healthCheckService(service);
        results.set(name, isHealthy);

        // Update service health status
        service.isHealthy = isHealthy;
        service.lastHealthCheck = new Date();
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error.message);
        results.set(name, false);
        service.isHealthy = false;
        service.lastHealthCheck = new Date();
      }
    }

    return results;
  }

  /**
   * Health check for a single service
   */
  async healthCheckService(service) {
    try {
      const healthUrl = `${service.baseUrl}${service.healthCheckPath}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout);

      const response = await fetch(healthUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Gateway-Health-Check',
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn(`Health check failed for ${service.name}:`, error.message);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    const services = this.getAllServices();
    const routes = this.getAllRoutes();

    return {
      totalServices: services.length,
      healthyServices: services.filter((s) => s.isHealthy).length,
      totalRoutes: routes.length,
      servicesByType: this.groupServicesByType(services),
      routesByService: this.groupRoutesByService(routes),
    };
  }

  /**
   * Group services by their metadata type
   */
  groupServicesByType(services) {
    const groups = {};

    for (const service of services) {
      const type = service.metadata?.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    }

    return groups;
  }

  /**
   * Group routes by service
   */
  groupRoutesByService(routes) {
    const groups = {};

    for (const route of routes) {
      const serviceName = route.serviceName;
      groups[serviceName] = (groups[serviceName] || 0) + 1;
    }

    return groups;
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();

export default serviceRegistry;
