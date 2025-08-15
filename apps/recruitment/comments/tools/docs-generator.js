#!/usr/bin/env node

/**
 * Unified API Documentation Generator
 * Modern approach using Fastify's native OpenAPI support
 */

import { generateEnhancedDocs } from './swagger-generator.js';
import { generatePostmanCollection } from './postman-generator.js';

/**
 * Generate all API documentation
 */
async function generateAllDocs() {
  console.log('🚀 Starting modern API documentation generation...\n');
  
  try {
    // Step 1: Generate OpenAPI specification using Fastify native support
    console.log('📖 Step 1: Generating OpenAPI specification...');
    const swaggerResult = await generateEnhancedDocs();
    
    if (!swaggerResult.success) {
      throw new Error(`OpenAPI generation failed: ${swaggerResult.error}`);
    }
    
    console.log('✅ OpenAPI specification generated successfully!');
    
    // Step 2: Generate Postman collection from OpenAPI spec
    console.log('\n📮 Step 2: Generating Postman collection...');
    const postmanResult = await generatePostmanCollection(swaggerResult.spec);
    
    if (!postmanResult.success) {
      console.warn('⚠️  Postman collection generation failed:', postmanResult.error);
    } else {
      console.log('✅ Postman collection generated successfully!');
    }
    
    // Summary
    console.log('\n🎉 Documentation generation completed!');
    console.log('\n📁 Generated files:');
    console.log(`   • OpenAPI spec: ${swaggerResult.outputFile}`);
    console.log(`   • API summary: ./docs/api-summary.json`);
    console.log(`   • Endpoints list: ./docs/endpoints-list.json`);
    if (postmanResult.success) {
      console.log(`   • Postman collection: ${postmanResult.outputFile}`);
    }
    
    console.log('\n🚀 Quick start:');
    console.log('   • Start server: npm run dev');
    console.log('   • View docs: http://localhost:3000/api-docs');
    console.log('   • Import Postman collection into Postman');
    
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Documentation generation failed:', error.message);
    return { success: false, error: error.message };
  }
}

// CLI support
if (process.argv[1] === import.meta.url) {
  const result = await generateAllDocs();
  process.exit(result.success ? 0 : 1);
}

export { generateAllDocs };