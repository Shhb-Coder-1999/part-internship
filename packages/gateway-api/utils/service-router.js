/**
 * Dynamic Service Router
 * Generates Fastify routes for microservices based on configuration
 */

import { gatewayConfig } from '../config/fastify.config.js';

/**
 * Service route generator
 */
export class ServiceRouter {
  constructor(fastify) {
    this.fastify = fastify;
  }

  /**
   * Register all service routes from configuration
   */
  async registerAllServices() {
    for (const [category, services] of Object.entries(gatewayConfig.services)) {
      if (typeof services === 'object' && services.url) {
        // Single service (like college, internship)
        await this.registerService(category, services);
      } else {
        // Service category with multiple services (like recruitment)
        for (const [serviceName, serviceConfig] of Object.entries(services)) {
          await this.registerService(
            `${category}-${serviceName}`,
            serviceConfig
          );
        }
      }
    }
  }

  /**
   * Register a single service
   */
  async registerService(serviceName, serviceConfig) {
    if (serviceConfig.status === 'planned') {
      // Register placeholder for planned services
      await this.registerPlaceholderService(serviceName, serviceConfig);
      return;
    }

    this.fastify.register(
      async function (fastify) {
        // Apply authentication if required
        if (serviceConfig.auth === 'required') {
          fastify.addHook('preHandler', fastify.authenticate);
        } else if (serviceConfig.auth === 'optional') {
          fastify.addHook('preHandler', async (request, reply) => {
            try {
              await request.jwtVerify();
            } catch (err) {
              // Optional auth - continue without user
              request.user = null;
            }
          });
        }

        // Apply role-based authorization
        if (serviceConfig.roles && serviceConfig.roles.length > 0) {
          fastify.addHook('preHandler', fastify.authorize(serviceConfig.roles));
        }

        // Register HTTP proxy
        await fastify.register(import('@fastify/http-proxy'), {
          upstream: serviceConfig.url,
          prefix: serviceConfig.prefix,
          rewritePrefix: serviceConfig.rewritePrefix,
          preHandler: async (request, reply) => {
            // Add user context headers
            if (request.user) {
              request.headers['x-user-id'] = request.user.id;
              request.headers['x-user-email'] = request.user.email;
              request.headers['x-user-roles'] = JSON.stringify(
                request.user.roles || []
              );
            }

            // Add request ID for tracing
            request.headers['x-request-id'] = request.id;
            request.headers['x-gateway-version'] = '2.0.0';
            request.headers['x-service-name'] = serviceName;
          },
          replyOptions: {
            rewriteRequestHeaders: (originalReq, headers) => {
              // Remove sensitive headers
              delete headers.authorization;
              return headers;
            },
          },
          retries: 3,
          timeout: 30000,
        });

        this.fastify.log.info(
          `✅ Registered service: ${serviceName} -> ${serviceConfig.url}`
        );
      },
      { prefix: serviceConfig.prefix }
    );
  }

  /**
   * Register placeholder for planned services
   */
  async registerPlaceholderService(serviceName, serviceConfig) {
    const prefix = serviceConfig.prefix;

    this.fastify.register(async function (fastify) {
      // Apply authentication for planned services too
      if (serviceConfig.auth === 'required') {
        fastify.addHook('preHandler', fastify.authenticate);
      }

      // Catch-all route for planned service
      fastify.all(
        `${prefix}/*`,
        {
          schema: {
            description: `${serviceName} service placeholder`,
            tags: [serviceName.split('-')[0]],
            security:
              serviceConfig.auth === 'required'
                ? [{ bearerAuth: [] }]
                : undefined,
          },
        },
        async (request, reply) => {
          return {
            message: `${serviceName} service not yet implemented`,
            path: request.url,
            method: request.method,
            userRoles: request.user?.roles || [],
            note: `This endpoint will be available when ${serviceName} service is deployed`,
            plannedFeatures: this.getPlannedFeatures(serviceName),
            estimatedAvailability: this.getEstimatedAvailability(serviceName),
          };
        }
      );

      this.fastify.log.info(
        `📋 Registered placeholder: ${serviceName} -> ${prefix}`
      );
    });
  }

  /**
   * Get planned features for a service
   */
  getPlannedFeatures(serviceName) {
    const features = {
      college: [
        'Student management',
        'Course catalog',
        'Enrollment system',
        'Grade management',
        'Class scheduling',
      ],
      internship: [
        'Internship postings',
        'Application tracking',
        'Supervisor assignment',
        'Progress monitoring',
        'Evaluation system',
      ],
    };

    return (
      features[serviceName.split('-')[0]] || ['Feature planning in progress']
    );
  }

  /**
   * Get estimated availability for a service
   */
  getEstimatedAvailability(serviceName) {
    const availability = {
      college: 'Q2 2024',
      internship: 'Q3 2024',
    };

    return availability[serviceName.split('-')[0]] || 'TBD';
  }

  /**
   * Register service health checks
   */
  async registerServiceHealthChecks() {
    this.fastify.get(
      '/health/services',
      {
        schema: {
          description: 'Check health of all downstream services',
          tags: ['health'],
          security: [{ bearerAuth: [] }],
        },
        preHandler: this.fastify.authenticate,
      },
      async (request, reply) => {
        const serviceStatus = {};

        for (const [category, services] of Object.entries(
          gatewayConfig.services
        )) {
          if (typeof services === 'object' && services.url) {
            serviceStatus[category] = await this.checkServiceHealth(
              category,
              services.url
            );
          } else {
            for (const [serviceName, serviceConfig] of Object.entries(
              services
            )) {
              if (serviceConfig.status !== 'planned') {
                serviceStatus[`${category}-${serviceName}`] =
                  await this.checkServiceHealth(
                    `${category}-${serviceName}`,
                    serviceConfig.url
                  );
              }
            }
          }
        }

        return {
          timestamp: new Date().toISOString(),
          gateway: 'healthy',
          services: serviceStatus,
        };
      }
    );
  }

  /**
   * Check individual service health
   */
  async checkServiceHealth(serviceName, serviceUrl) {
    const start = Date.now();

    try {
      const response = await fetch(`${serviceUrl}/health`, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'FastifyGateway/2.0.0',
        },
      });

      const responseTime = Date.now() - start;

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        statusCode: response.status,
        url: serviceUrl,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start,
        url: serviceUrl,
      };
    }
  }

  /**
   * Register service discovery endpoints
   */
  async registerServiceDiscovery() {
    this.fastify.get(
      '/services',
      {
        schema: {
          description: 'List all available services',
          tags: ['info'],
          response: {
            200: {
              type: 'object',
              properties: {
                services: { type: 'object' },
                gateway: { type: 'object' },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const services = {};

        for (const [category, categoryServices] of Object.entries(
          gatewayConfig.services
        )) {
          if (typeof categoryServices === 'object' && categoryServices.url) {
            services[category] = {
              prefix: categoryServices.prefix,
              status: categoryServices.status || 'active',
              auth: categoryServices.auth,
              roles: categoryServices.roles,
            };
          } else {
            services[category] = {};
            for (const [serviceName, serviceConfig] of Object.entries(
              categoryServices
            )) {
              services[category][serviceName] = {
                prefix: serviceConfig.prefix,
                status: serviceConfig.status || 'active',
                auth: serviceConfig.auth,
                roles: serviceConfig.roles,
              };
            }
          }
        }

        return {
          services,
          gateway: {
            version: '2.0.0',
            framework: 'Fastify',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
          },
        };
      }
    );
  }
}

export default ServiceRouter;
