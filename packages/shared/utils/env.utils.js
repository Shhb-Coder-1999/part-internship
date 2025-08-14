import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Environment Utility for loading and managing environment variables
 * Supports loading from multiple sources: .env files, process.env, defaults
 */

// Cache for loaded environment configs
const envCache = new Map();

/**
 * Load environment variables from multiple sources
 * Priority: process.env > .env file > defaults
 */
export class EnvLoader {
  constructor(basePath, envFileName = '.env') {
    this.basePath = basePath;
    this.envFileName = envFileName;
    this.envVars = new Map();
    this.loaded = false;
  }

  /**
   * Load environment variables from .env file and process.env
   */
  load() {
    if (this.loaded) return this;

    // Load from .env file first
    this.loadFromFile();

    // Override with process.env
    this.loadFromProcess();

    this.loaded = true;
    return this;
  }

  /**
   * Load environment variables from .env file
   */
  loadFromFile() {
    const envPath = join(this.basePath, this.envFileName);

    if (!existsSync(envPath)) {
      console.warn(`Environment file not found: ${envPath}`);
      return;
    }

    try {
      const envContent = readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        const equalIndex = trimmed.indexOf('=');
        if (equalIndex === -1) continue;

        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();

        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        this.envVars.set(key, cleanValue);
      }
    } catch (error) {
      console.error(
        `Error loading environment file ${envPath}:`,
        error.message
      );
    }
  }

  /**
   * Load environment variables from process.env (higher priority)
   */
  loadFromProcess() {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.envVars.set(key, value);
      }
    }
  }

  /**
   * Get environment variable with default value and type conversion
   */
  get(key, defaultValue = undefined, type = 'string') {
    if (!this.loaded) this.load();

    const value = this.envVars.get(key);

    if (value === undefined) {
      return defaultValue;
    }

    return this.convertType(value, type);
  }

  /**
   * Get required environment variable (throws if not found)
   */
  getRequired(key, type = 'string') {
    const value = this.get(key, undefined, type);

    if (value === undefined) {
      throw new Error(`Required environment variable "${key}" is not set`);
    }

    return value;
  }

  /**
   * Convert string value to specified type
   */
  convertType(value, type) {
    switch (type.toLowerCase()) {
      case 'string':
        return value;

      case 'number':
      case 'int':
      case 'integer':
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          throw new Error(
            `Invalid number value for environment variable: ${value}`
          );
        }
        return num;

      case 'float':
      case 'decimal':
        const float = parseFloat(value);
        if (isNaN(float)) {
          throw new Error(
            `Invalid float value for environment variable: ${value}`
          );
        }
        return float;

      case 'boolean':
      case 'bool':
        return value.toLowerCase() === 'true' || value === '1';

      case 'array':
        return value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0);

      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new Error(
            `Invalid JSON value for environment variable: ${value}`
          );
        }

      default:
        return value;
    }
  }

  /**
   * Check if environment variable exists
   */
  has(key) {
    if (!this.loaded) this.load();
    return this.envVars.has(key);
  }

  /**
   * Get all environment variables as object
   */
  getAll() {
    if (!this.loaded) this.load();
    return Object.fromEntries(this.envVars);
  }
}

/**
 * Create or get cached environment loader for a path
 */
export function createEnvLoader(basePath, envFileName = '.env') {
  const cacheKey = `${basePath}:${envFileName}`;

  if (envCache.has(cacheKey)) {
    return envCache.get(cacheKey);
  }

  const loader = new EnvLoader(basePath, envFileName);
  envCache.set(cacheKey, loader);

  return loader;
}

/**
 * Utility function to get environment variable from service's envs directory
 */
export function getEnv(servicePath, key, defaultValue, type = 'string') {
  const envsPath = join(servicePath, 'envs');
  const loader = createEnvLoader(envsPath);
  return loader.get(key, defaultValue, type);
}

/**
 * Utility function to get required environment variable
 */
export function getRequiredEnv(servicePath, key, type = 'string') {
  const envsPath = join(servicePath, 'envs');
  const loader = createEnvLoader(envsPath);
  return loader.getRequired(key, type);
}

/**
 * Load environment configuration from service directory
 */
export function loadServiceEnv(servicePath, envFileName = '.env') {
  const envsPath = join(servicePath, 'envs');
  const loader = createEnvLoader(envsPath, envFileName);
  return loader.load();
}

/**
 * Get current file directory (ES modules helper)
 */
export function getCurrentDir(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

/**
 * Helper to load environment for current service
 */
export function loadCurrentServiceEnv(importMetaUrl, envFileName = '.env') {
  const currentDir = getCurrentDir(importMetaUrl);
  return loadServiceEnv(currentDir, envFileName);
}

export default {
  EnvLoader,
  createEnvLoader,
  getEnv,
  getRequiredEnv,
  loadServiceEnv,
  getCurrentDir,
  loadCurrentServiceEnv,
};
