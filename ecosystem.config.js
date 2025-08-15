// PM2 ecosystem configuration for production
module.exports = {
  apps: [
    {
      name: 'gateway-api',
      script: './packages/gateway-api/index.js',
      cwd: './packages/gateway-api',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        COMMENTS_SERVICE_URL: 'http://localhost:3001',
        USER_MANAGEMENT_SERVICE_URL: 'http://localhost:3002',
        SAHAB_SERVICE_URL: 'http://localhost:3003',
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_file: './logs/gateway-combined.log',
      time: true,
    },
    {
      name: 'comments-api',
      script: './apps/recruitment/comments/server.js',
      cwd: './apps/recruitment/comments',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/comments-error.log',
      out_file: './logs/comments-out.log',
      log_file: './logs/comments-combined.log',
      time: true,
    },


  ],
};
