/**
 * Jest Setup File for API Gateway Tests
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.GATEWAY_PORT = '8080';