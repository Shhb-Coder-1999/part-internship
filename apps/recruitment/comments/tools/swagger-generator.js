#!/usr/bin/env node

/**
 * Modern Swagger/OpenAPI Generator for Fastify
 * Leverages Fastify's native OpenAPI support for optimal performance
 */

import fs from 'fs/promises';
import path from 'path';
import { TOOL_CONFIG } from './config.js';

/**
 * Generate OpenAPI spec from Fastify server instance
 * This approach uses Fastify's built-in OpenAPI generation
 */
export async function generateOpenAPISpec() {
  try {
    console.log('🔍 Generating OpenAPI specification from Fastify server...');
    
    // Dynamic import of the server to extract OpenAPI spec
    const { createFastifyServer } = await import('../src/server-instance.js');
    
    // Create server instance for spec extraction
    const fastify = await createFastifyServer();
    
    // Generate OpenAPI spec using Fastify's native support
    const openApiSpec = fastify.swagger();
    
    // Ensure output directory exists
    const outputDir = path.dirname(TOOL_CONFIG.output.swagger);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write the specification
    await fs.writeFile(
      TOOL_CONFIG.output.swagger,
      JSON.stringify(openApiSpec, null, 2),
      'utf8'
    );
    
    // Clean up
    await fastify.close();
    
    console.log('✅ OpenAPI specification generated successfully!');
    console.log(`📁 Output: ${TOOL_CONFIG.output.swagger}`);
    
    return { 
      success: true, 
      spec: openApiSpec,
      outputFile: TOOL_CONFIG.output.swagger 
    };
    
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate API documentation with enhanced features
 */
export async function generateEnhancedDocs() {
  try {
    console.log('🚀 Starting enhanced API documentation generation...');
    
    const result = await generateOpenAPISpec();
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Generate additional documentation files
    await generateApiSummary(result.spec);
    await generateEndpointsList(result.spec);
    
    console.log('🎉 Enhanced documentation generation completed!');
    return result;
    
  } catch (error) {
    console.error('❌ Enhanced documentation generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate API summary file
 */
async function generateApiSummary(spec) {
  const summary = {
    title: spec.info?.title || 'API',
    version: spec.info?.version || '1.0.0',
    description: spec.info?.description || '',
    servers: spec.servers || [],
    totalEndpoints: Object.keys(spec.paths || {}).length,
    tags: spec.tags || [],
    lastGenerated: new Date().toISOString()
  };
  
  const summaryPath = path.join(TOOL_CONFIG.output.docs, 'api-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log('📊 API summary generated at:', summaryPath);
}

/**
 * Generate endpoints list for quick reference
 */
async function generateEndpointsList(spec) {
  const endpoints = [];
  
  Object.entries(spec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: details.summary || '',
        description: details.description || '',
        tags: details.tags || [],
        operationId: details.operationId || ''
      });
    });
  });
  
  const endpointsPath = path.join(TOOL_CONFIG.output.docs, 'endpoints-list.json');
  await fs.writeFile(endpointsPath, JSON.stringify(endpoints, null, 2), 'utf8');
  console.log('📋 Endpoints list generated at:', endpointsPath);
}

// CLI support
if (process.argv[1] === import.meta.url) {
  await generateEnhancedDocs();
}