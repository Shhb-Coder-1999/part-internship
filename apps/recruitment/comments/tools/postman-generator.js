#!/usr/bin/env node

/**
 * Modern Postman Collection Generator
 * Generates comprehensive Postman collections from OpenAPI specifications
 */

import fs from 'fs/promises';
import path from 'path';
import { TOOL_CONFIG } from './config.js';

/**
 * Generate Postman collection from OpenAPI specification
 * @param {Object} openApiSpec - The OpenAPI specification object
 * @returns {Object} Result object with success status and generated collection
 */
export async function generatePostmanCollection(openApiSpec) {
  try {
    console.log('📮 Generating Postman collection from OpenAPI spec...');
    
    if (!openApiSpec) {
      throw new Error('OpenAPI specification is required');
    }

    const collection = createPostmanCollection(openApiSpec);
    const outputPath = TOOL_CONFIG.output.postman;
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write collection file
    await fs.writeFile(
      outputPath,
      JSON.stringify(collection, null, 2),
      'utf8'
    );
    
    console.log('✅ Postman collection generated successfully!');
    console.log(`📁 Output: ${outputPath}`);
    
    return { 
      success: true, 
      collection,
      outputFile: outputPath 
    };
    
  } catch (error) {
    console.error('❌ Error generating Postman collection:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create Postman collection structure from OpenAPI spec
 * @param {Object} spec - OpenAPI specification
 * @returns {Object} Postman collection object
 */
function createPostmanCollection(spec) {
  const collection = {
    info: {
      name: spec.info?.title || 'API Collection',
      description: generateCollectionDescription(spec),
      version: spec.info?.version || '1.0.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: createEnvironmentVariables(spec),
    item: [],
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Global pre-request script',
            'console.log(`🚀 Executing: ${pm.info.requestName}`);',
            '',
            '// Set timestamp',
            'pm.globals.set("timestamp", new Date().toISOString());'
          ]
        }
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            '// Global test script',
            'pm.test("Response time is acceptable", function () {',
            '    pm.expect(pm.response.responseTime).to.be.below(2000);',
            '});',
            '',
            'pm.test("Response has proper structure", function () {',
            '    const jsonData = pm.response.json();',
            '    pm.expect(jsonData).to.have.property("success");',
            '    pm.expect(jsonData).to.have.property("timestamp");',
            '});'
          ]
        }
      }
    ]
  };

  // Group endpoints by tags
  const groupedEndpoints = groupEndpointsByTags(spec);
  
  // Create collection items
  Object.entries(groupedEndpoints).forEach(([tag, endpoints]) => {
    const folder = {
      name: tag,
      description: getTagDescription(spec, tag),
      item: endpoints.map(endpoint => createPostmanRequest(endpoint, spec))
    };
    collection.item.push(folder);
  });

  return collection;
}

/**
 * Generate collection description with API info
 */
function generateCollectionDescription(spec) {
  const lines = [
    spec.info?.description || 'API Collection',
    '',
    `**Version:** ${spec.info?.version || '1.0.0'}`,
    `**Generated:** ${new Date().toISOString()}`,
    ''
  ];

  if (spec.info?.contact) {
    lines.push('**Contact:**');
    if (spec.info.contact.name) lines.push(`- Name: ${spec.info.contact.name}`);
    if (spec.info.contact.email) lines.push(`- Email: ${spec.info.contact.email}`);
    lines.push('');
  }

  if (spec.servers && spec.servers.length > 0) {
    lines.push('**Available Servers:**');
    spec.servers.forEach(server => {
      lines.push(`- ${server.url} - ${server.description || 'Server'}`);
    });
    lines.push('');
  }

  lines.push('**Usage:**');
  lines.push('1. Import this collection into Postman');
  lines.push('2. Set up environment variables (baseUrl, port)');
  lines.push('3. Run individual requests or use the Collection Runner');
  lines.push('4. Check the Tests tab for automated validations');

  return lines.join('\n');
}

/**
 * Create environment variables for the collection
 */
function createEnvironmentVariables(spec) {
  const variables = [
    {
      key: 'baseUrl',
      value: 'localhost',
      type: 'string',
      description: 'Base URL for the API server'
    },
    {
      key: 'port',
      value: '3000',
      type: 'string',
      description: 'Port number for the API server'
    }
  ];

  // Add server-specific variables if available
  if (spec.servers && spec.servers.length > 0) {
    const primaryServer = spec.servers[0];
    try {
      const url = new URL(primaryServer.url);
      variables[0].value = url.hostname;
      variables[1].value = url.port || (url.protocol === 'https:' ? '443' : '80');
    } catch (e) {
      // Use default values if URL parsing fails
    }
  }

  return variables;
}

/**
 * Group endpoints by their tags for better organization
 */
function groupEndpointsByTags(spec) {
  const grouped = {};
  
  Object.entries(spec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      const tags = details.tags || ['Untagged'];
      const endpoint = {
        path,
        method: method.toUpperCase(),
        ...details
      };
      
      tags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        grouped[tag].push(endpoint);
      });
    });
  });
  
  return grouped;
}

/**
 * Get description for a specific tag
 */
function getTagDescription(spec, tagName) {
  const tag = spec.tags?.find(t => t.name === tagName);
  return tag?.description || `Operations related to ${tagName}`;
}

/**
 * Create a Postman request from an endpoint specification
 */
function createPostmanRequest(endpoint, spec) {
  const request = {
    name: generateRequestName(endpoint),
    request: {
      method: endpoint.method,
      header: generateHeaders(endpoint),
      url: generateUrl(endpoint),
      description: endpoint.description || endpoint.summary || ''
    },
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: generateTestScript(endpoint)
        }
      }
    ]
  };

  // Add request body for applicable methods
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody) {
    request.request.body = generateRequestBody(endpoint, spec);
  }

  return request;
}

/**
 * Generate request name from endpoint info
 */
function generateRequestName(endpoint) {
  const summary = endpoint.summary || endpoint.operationId;
  if (summary) return summary;
  
  const action = {
    'GET': 'Get',
    'POST': 'Create',
    'PUT': 'Update',
    'PATCH': 'Update',
    'DELETE': 'Delete'
  }[endpoint.method] || endpoint.method;
  
  return `${action} ${endpoint.path}`;
}

/**
 * Generate request headers
 */
function generateHeaders(endpoint) {
  const headers = [
    {
      key: 'Content-Type',
      value: 'application/json',
      type: 'text'
    },
    {
      key: 'Accept',
      value: 'application/json',
      type: 'text'
    }
  ];

  // Add auth header if security is defined
  if (endpoint.security) {
    headers.push({
      key: 'Authorization',
      value: 'Bearer {{authToken}}',
      type: 'text',
      description: 'Authentication token'
    });
  }

  return headers;
}

/**
 * Generate URL object for the request
 */
function generateUrl(endpoint) {
  const pathParts = endpoint.path.split('/').filter(part => part);
  
  // Convert path parameters to Postman format
  const path = pathParts.map(part => {
    if (part.startsWith(':')) {
      return `{{${part.substring(1)}}}`;
    }
    if (part.startsWith('{') && part.endsWith('}')) {
      return `{{${part.substring(1, part.length - 1)}}}`;
    }
    return part;
  });

  const url = {
    raw: `{{baseUrl}}:{{port}}/${path.join('/')}`,
    host: ['{{baseUrl}}'],
    port: '{{port}}',
    path
  };

  // Add query parameters
  const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
  if (queryParams.length > 0) {
    url.query = queryParams.map(param => ({
      key: param.name,
      value: generateExampleValue(param),
      description: param.description || '',
      disabled: !param.required
    }));
  }

  return url;
}

/**
 * Generate request body for POST/PUT/PATCH requests
 */
function generateRequestBody(endpoint, spec) {
  const requestBody = endpoint.requestBody;
  if (!requestBody?.content) return null;

  // Prefer JSON content
  const jsonContent = requestBody.content['application/json'];
  if (jsonContent?.schema) {
    return {
      mode: 'raw',
      raw: JSON.stringify(generateExampleFromSchema(jsonContent.schema, spec), null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }

  return {
    mode: 'raw',
    raw: '{\n  // Add request body here\n}',
    options: {
      raw: {
        language: 'json'
      }
    }
  };
}

/**
 * Generate example value from parameter or schema
 */
function generateExampleValue(param) {
  if (param.example !== undefined) return param.example;
  if (param.schema?.example !== undefined) return param.schema.example;
  
  const type = param.type || param.schema?.type;
  switch (type) {
    case 'string': return 'example';
    case 'integer': return 123;
    case 'number': return 123.45;
    case 'boolean': return true;
    case 'array': return [];
    default: return '';
  }
}

/**
 * Generate example object from schema
 */
function generateExampleFromSchema(schema, spec, depth = 0) {
  if (depth > 3) return {}; // Prevent infinite recursion
  
  if (schema.example) return schema.example;
  
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    const refSchema = spec.components?.schemas?.[refPath];
    if (refSchema) return generateExampleFromSchema(refSchema, spec, depth + 1);
  }
  
  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      example[key] = generateExampleFromSchema(prop, spec, depth + 1);
    });
    return example;
  }
  
  if (schema.type === 'array' && schema.items) {
    return [generateExampleFromSchema(schema.items, spec, depth + 1)];
  }
  
  // Fallback examples
  switch (schema.type) {
    case 'string': 
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'email') return 'user@example.com';
      return schema.example || 'example';
    case 'integer': return schema.example || 123;
    case 'number': return schema.example || 123.45;
    case 'boolean': return schema.example || true;
    default: return null;
  }
}

/**
 * Generate test script for the request
 */
function generateTestScript(endpoint) {
  const tests = [
    '// Validate response status',
    'pm.test("Status code is success", function () {',
    '    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
    '});',
    ''
  ];

  // Add method-specific tests
  switch (endpoint.method) {
    case 'POST':
      tests.push(
        'pm.test("Resource created successfully", function () {',
        '    pm.expect(pm.response.code).to.equal(201);',
        '    const jsonData = pm.response.json();',
        '    pm.expect(jsonData.success).to.be.true;',
        '});'
      );
      break;
    case 'GET':
      tests.push(
        'pm.test("Data retrieved successfully", function () {',
        '    const jsonData = pm.response.json();',
        '    pm.expect(jsonData.success).to.be.true;',
        '    pm.expect(jsonData.data).to.exist;',
        '});'
      );
      break;
    case 'DELETE':
      tests.push(
        'pm.test("Resource deleted successfully", function () {',
        '    const jsonData = pm.response.json();',
        '    pm.expect(jsonData.success).to.be.true;',
        '});'
      );
      break;
  }

  return tests;
}

// CLI support
if (process.argv[1] === import.meta.url) {
  try {
    // Try to read existing OpenAPI spec
    const specPath = TOOL_CONFIG.output.swagger;
    const specContent = await fs.readFile(specPath, 'utf8');
    const openApiSpec = JSON.parse(specContent);
    
    await generatePostmanCollection(openApiSpec);
  } catch (error) {
    console.error('❌ Failed to generate Postman collection:', error.message);
    console.log('💡 Make sure to run swagger-generator first to create the OpenAPI spec');
    process.exit(1);
  }
}