/**
 * Gateway Client for Authentication Integration
 */

import { ENV_VARS, DEFAULTS } from '#app/constants';

class GatewayClient {
  constructor() {
    this.baseUrl = process.env[ENV_VARS.GATEWAY_URL] || 'http://localhost:3000';
    this.authEndpoint = process.env[ENV_VARS.GATEWAY_AUTH_ENDPOINT] || '/api/auth';
  }

  /**
   * Verify token with gateway
   */
  async verifyToken(token) {
    try {
      const response = await fetch(`${this.baseUrl}${this.authEndpoint}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return { valid: false, error: 'Token verification failed' };
      }

      const data = await response.json();
      return { valid: true, user: data.data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Register user with gateway (if needed)
   */
  async registerUser(userData) {
    try {
      const response = await fetch(`${this.baseUrl}${this.authEndpoint}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      return { success: true, user: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Login user with gateway
   */
  async loginUser(credentials) {
    try {
      const response = await fetch(`${this.baseUrl}${this.authEndpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      return { success: true, token: data.token, user: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile from gateway
   */
  async getUserProfile(token) {
    try {
      const response = await fetch(`${this.baseUrl}${this.authEndpoint}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return { success: false, error: 'Failed to get user profile' };
      }

      const data = await response.json();
      return { success: true, user: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new GatewayClient();