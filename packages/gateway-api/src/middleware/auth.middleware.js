/**
 * Authentication and Authorization Middleware
 * Handles JWT verification, user authentication, and role-based authorization
 */

export function createAuthMiddleware(fastify) {
  // Create authentication decorator
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      // Skip authentication for specified routes
      const skipRoutes = ['/health', '/', '/api-docs'];
      if (skipRoutes.some(route => request.url.startsWith(route))) {
        return;
      }

      // Check for authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Authorization header missing or invalid',
          timestamp: new Date().toISOString(),
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify JWT token
      const decoded = fastify.jwt.verify(token);
      
      // Get user from database
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({
          success: false,
          error: 'User not found or inactive',
          timestamp: new Date().toISOString(),
        });
      }

      // Add user info to request with roles
      request.user = {
        ...user,
        roles: user.roles.map(ur => ur.role.name)
      };
      
    } catch (error) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create admin authorization decorator
  fastify.decorate('requireAdmin', async function (request, reply) {
    if (!request.user || !request.user.roles || !request.user.roles.includes('admin')) {
      return reply.status(403).send({
        success: false,
        error: 'Admin access required',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create role-based authorization decorator
  fastify.decorate('authorize', function(requiredRoles) {
    return async function (request, reply) {
      if (!request.user || !request.user.roles) {
        return reply.status(403).send({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const hasRequiredRole = requiredRoles.some(role => 
        request.user.roles.includes(role)
      );

      if (!hasRequiredRole) {
        return reply.status(403).send({
          success: false,
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }
    };
  });
}

export default createAuthMiddleware;