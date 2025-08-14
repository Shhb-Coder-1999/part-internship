export default function (plop) {
  // Set default base path for templates
  plop.setDefaultInclude({ generators: true });

  // Helper functions
  plop.setHelper('upperCase', (text) => text.toUpperCase());
  plop.setHelper('lowerCase', (text) => text.toLowerCase());
  plop.setHelper('camelCase', (text) => plop.getHelper('camelCase')(text));
  plop.setHelper('pascalCase', (text) => plop.getHelper('pascalCase')(text));
  plop.setHelper('dashCase', (text) => plop.getHelper('dashCase')(text));

  // Microservice Generator
  plop.setGenerator('microservice', {
    description: 'Create a complete microservice with all necessary files',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Microservice name (e.g., user-management, notifications):',
        validate: (input) => {
          if (!input) return 'Name is required';
          if (!/^[a-z-]+$/.test(input))
            return 'Name must be lowercase with dashes only';
          return true;
        },
      },
      {
        type: 'list',
        name: 'category',
        message: 'Which category does this service belong to?',
        choices: ['recruitment', 'college', 'internship'],
        default: 'recruitment',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Service description:',
        default: 'A microservice for {{name}}',
      },
      {
        type: 'input',
        name: 'port',
        message: 'Default port:',
        default: '3000',
        validate: (input) => {
          const port = parseInt(input);
          if (isNaN(port) || port < 1000 || port > 65535) {
            return 'Port must be a number between 1000 and 65535';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'includeDatabase',
        message: 'Include Prisma database setup?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeAuth',
        message: 'Include authentication middleware?',
        default: true,
      },
    ],
    actions: (data) => {
      const actions = [
        // Package.json
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/package.json',
          templateFile: 'packages/plop-templates/microservice/package.json.hbs',
        },
        // Server file
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/server.js',
          templateFile: 'packages/plop-templates/microservice/server.js.hbs',
        },
        // Service config
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/service.config.js',
          templateFile:
            'packages/plop-templates/microservice/service.config.js.hbs',
        },
        // README
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/README.md',
          templateFile: 'packages/plop-templates/microservice/README.md.hbs',
        },
        // Source directory structure
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/index.js',
          templateFile: 'packages/plop-templates/microservice/src/index.js.hbs',
        },
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/routes/index.js',
          templateFile:
            'packages/plop-templates/microservice/src/routes/index.js.hbs',
        },
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/controllers/index.js',
          templateFile:
            'packages/plop-templates/microservice/src/controllers/index.js.hbs',
        },
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/services/index.js',
          templateFile:
            'packages/plop-templates/microservice/src/services/index.js.hbs',
        },
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/middleware/index.js',
          templateFile:
            'packages/plop-templates/microservice/src/middleware/index.js.hbs',
        },
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/src/utils/index.js',
          templateFile:
            'packages/plop-templates/microservice/src/utils/index.js.hbs',
        },
        // Environment files
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/envs/.env.example',
          templateFile:
            'packages/plop-templates/microservice/envs/.env.example.hbs',
        },
        // Docker
        {
          type: 'add',
          path: 'apps/{{category}}/{{dashCase name}}/Dockerfile',
          templateFile: 'packages/plop-templates/microservice/Dockerfile.hbs',
        },
      ];

      // Add database-specific files if requested
      if (data.includeDatabase) {
        actions.push(
          {
            type: 'add',
            path: 'apps/{{category}}/{{dashCase name}}/prisma/schema.prisma',
            templateFile:
              'packages/plop-templates/microservice/prisma/schema.prisma.hbs',
          },
          {
            type: 'add',
            path: 'apps/{{category}}/{{dashCase name}}/prisma/seed.js',
            templateFile:
              'packages/plop-templates/microservice/prisma/seed.js.hbs',
          },
          {
            type: 'add',
            path: 'apps/{{category}}/{{dashCase name}}/src/clients/prismaClient.js',
            templateFile:
              'packages/plop-templates/microservice/src/clients/prismaClient.js.hbs',
          }
        );
      }

      return actions;
    },
  });

  // CRUD Operation Generator
  plop.setGenerator('crud', {
    description: 'Generate CRUD operations for a specific entity',
    prompts: [
      {
        type: 'input',
        name: 'servicePath',
        message: 'Service path (e.g., apps/recruitment/comments):',
        validate: (input) => {
          if (!input) return 'Service path is required';
          return true;
        },
      },
      {
        type: 'input',
        name: 'entityName',
        message: 'Entity name (singular, e.g., User, Comment, Post):',
        validate: (input) => {
          if (!input) return 'Entity name is required';
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Entity name must be PascalCase (e.g., User, BlogPost)';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'tableName',
        message: 'Database table name (e.g., users, comments):',
        default: (answers) =>
          plop.getHelper('lowerCase')(answers.entityName) + 's',
      },
      {
        type: 'checkbox',
        name: 'operations',
        message: 'Which CRUD operations to generate?',
        choices: [
          { name: 'Create', value: 'create', checked: true },
          { name: 'Read (Get All)', value: 'getAll', checked: true },
          { name: 'Read (Get By ID)', value: 'getById', checked: true },
          { name: 'Update', value: 'update', checked: true },
          { name: 'Delete', value: 'delete', checked: true },
        ],
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{servicePath}}/src/controllers/{{camelCase entityName}}Controller.js',
        templateFile: 'packages/plop-templates/crud/controller.js.hbs',
      },
      {
        type: 'add',
        path: '{{servicePath}}/src/services/{{camelCase entityName}}Service.js',
        templateFile: 'packages/plop-templates/crud/service.js.hbs',
      },
      {
        type: 'add',
        path: '{{servicePath}}/src/repositories/{{camelCase entityName}}Repository.js',
        templateFile: 'packages/plop-templates/crud/repository.js.hbs',
      },
      {
        type: 'add',
        path: '{{servicePath}}/src/routes/{{camelCase entityName}}.js',
        templateFile: 'packages/plop-templates/crud/routes.js.hbs',
      },
      {
        type: 'add',
        path: '{{servicePath}}/src/schemas/{{camelCase entityName}}Schemas.js',
        templateFile: 'packages/plop-templates/crud/schemas.js.hbs',
      },
      {
        type: 'add',
        path: '{{servicePath}}/tests/unit/{{camelCase entityName}}Controller.test.js',
        templateFile: 'packages/plop-templates/crud/controller.test.js.hbs',
      },
    ],
  });

  // Component Generator (for shared packages)
  plop.setGenerator('shared-component', {
    description: 'Generate a shared component (middleware, service, utility)',
    prompts: [
      {
        type: 'list',
        name: 'type',
        message: 'Component type:',
        choices: [
          { name: 'Middleware', value: 'middleware' },
          { name: 'Service', value: 'services' },
          { name: 'Utility', value: 'utils' },
          { name: 'Controller', value: 'controllers' },
          { name: 'Repository', value: 'repositories' },
        ],
      },
      {
        type: 'input',
        name: 'name',
        message: 'Component name (e.g., authMiddleware, loggerService):',
        validate: (input) => {
          if (!input) return 'Component name is required';
          if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(input)) {
            return 'Component name must be camelCase';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Component description:',
        default: 'Shared {{type}} component',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/shared/{{type}}/{{camelCase name}}.js',
        templateFile: 'packages/plop-templates/shared/component.js.hbs',
      },
      {
        type: 'add',
        path: 'packages/shared/tests/{{camelCase name}}.test.js',
        templateFile: 'packages/plop-templates/shared/component.test.js.hbs',
      },
    ],
  });

  // Migration Generator
  plop.setGenerator('migration', {
    description: 'Generate database migration files',
    prompts: [
      {
        type: 'input',
        name: 'servicePath',
        message: 'Service path (e.g., apps/recruitment/comments):',
        validate: (input) => {
          if (!input) return 'Service path is required';
          return true;
        },
      },
      {
        type: 'input',
        name: 'migrationName',
        message:
          'Migration name (e.g., add_user_roles, update_comments_table):',
        validate: (input) => {
          if (!input) return 'Migration name is required';
          if (!/^[a-z_]+$/.test(input)) {
            return 'Migration name must be lowercase with underscores';
          }
          return true;
        },
      },
    ],
    actions: [
      {
        type: 'add',
        path: '{{servicePath}}/prisma/migrations/{{migrationName}}/migration.sql',
        templateFile: 'packages/plop-templates/migration/migration.sql.hbs',
      },
    ],
  });
}
