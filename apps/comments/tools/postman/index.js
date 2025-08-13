import fs from 'fs';
import path from 'path';
import { baseConfig } from '../swagger/index.js';

// Postman collection template
const createPostmanCollection = (swaggerSpecs) => {
  const collection = {
    info: {
      name: baseConfig.info.title,
      description: baseConfig.info.description,
      version: baseConfig.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      {
        key: 'baseUrl',
        value: '{{baseUrl}}',
        type: 'string'
      },
      {
        key: 'port',
        value: '3000',
        type: 'string'
      }
    ],
    item: []
  };

  // Add endpoints from Swagger specs
  if (swaggerSpecs && swaggerSpecs.paths) {
    Object.entries(swaggerSpecs.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, details]) => {
        const item = {
          name: `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: [
              {
                key: 'Content-Type',
                value: 'application/json'
              }
            ],
            url: {
              raw: `{{baseUrl}}:{{port}}${path}`,
              host: ['{{baseUrl}}'],
              port: '{{port}}',
              path: path.split('/').filter(p => p)
            }
          }
        };

        // Add request body for POST/PUT/PATCH methods
        if (['post', 'put', 'patch'].includes(method) && details.requestBody) {
          item.request.body = {
            mode: 'raw',
            raw: JSON.stringify({
              // Default example values based on schema
              text: 'Example comment text',
              authorId: 'user_123'
            }, null, 2)
          };
        }

        // Add query parameters
        if (details.parameters) {
          const queryParams = details.parameters.filter(p => p.in === 'query');
          if (queryParams.length > 0) {
            item.request.url.query = queryParams.map(param => ({
              key: param.name,
              value: param.example || '',
              description: param.description || ''
            }));
          }
        }

        collection.item.push(item);
      });
    });
  }

  return collection;
};

// Generate Postman collection
export const generatePostmanCollection = async (swaggerSpecs) => {
  try {
    const collection = createPostmanCollection(swaggerSpecs);
    const outputFile = './docs/comments-api.postman_collection.json';
    
    // Ensure docs directory exists
    const docsDir = path.dirname(outputFile);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(collection, null, 2));
    console.log('✅ Postman collection generated successfully!');
    console.log(`📁 Output file: ${outputFile}`);
    return { success: true, outputFile };
  } catch (error) {
    console.error('❌ Error generating Postman collection:', error);
    return { success: false, error };
  }
};

// Generate Postman collection from Swagger file
export const generatePostmanFromSwaggerFile = async (swaggerFilePath = './docs/swagger-output.json') => {
  try {
    if (!fs.existsSync(swaggerFilePath)) {
      throw new Error(`Swagger file not found: ${swaggerFilePath}`);
    }
    
    const swaggerContent = fs.readFileSync(swaggerFilePath, 'utf8');
    const swaggerSpecs = JSON.parse(swaggerContent);
    
    return await generatePostmanCollection(swaggerSpecs);
  } catch (error) {
    console.error('❌ Error generating Postman collection from Swagger file:', error);
    return { success: false, error };
  }
};
