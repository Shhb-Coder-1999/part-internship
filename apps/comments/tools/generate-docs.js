#!/usr/bin/env node

import { generateHybrid } from './swagger/index.js';
import { generatePostmanCollection } from './postman/index.js';

console.log('🚀 Starting documentation generation...\n');

// Generate Swagger documentation
const swaggerResult = await generateHybrid();

if (swaggerResult.success) {
  console.log('\n📚 Swagger documentation generated successfully!');
  
  if (swaggerResult.specs) {
    console.log('✅ Generated from JSDoc comments');
  } else {
    console.log('✅ Generated automatically');
  }
  
  // Generate Postman collection from Swagger specs
  console.log('\n📮 Generating Postman collection...');
  
  let postmanResult;
  if (swaggerResult.specs) {
    // Use JSDoc generated specs
    postmanResult = await generatePostmanCollection(swaggerResult.specs);
  } else {
    // Use auto-generated Swagger file
    postmanResult = await generatePostmanCollection();
  }
  
  if (postmanResult.success) {
    console.log('✅ Postman collection generated successfully!');
  } else {
    console.log('⚠️  Postman collection generation failed:', postmanResult.error);
  }
  
  console.log('\n🎉 Documentation generation completed!');
  console.log('\n📁 Generated files:');
  console.log('   • Swagger: ./docs/swagger-output.json');
  console.log('   • Postman: ./docs/comments-api.postman_collection.json');
  console.log('\n🚀 You can now:');
  console.log('   • Start your server: npm run dev');
  console.log('   • View API docs at: /api-docs');
  console.log('   • Import Postman collection into Postman');
  
} else {
  console.error('❌ Failed to generate Swagger documentation:', swaggerResult.error);
  process.exit(1);
}
