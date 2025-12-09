/**
 * PM2 Configuration for Plugspace.io Titan v1.4
 * Cluster mode for high availability
 */

module.exports = {
  apps: [
    {
      name: 'plugspace-backend',
      script: './apps/backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'plugspace-landing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './apps/landing',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/landing-error.log',
      out_file: './logs/landing-out.log',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      autorestart: true,
    },
    {
      name: 'plugspace-studio',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './apps/studio',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/studio-error.log',
      out_file: './logs/studio-out.log',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      autorestart: true,
    },
    {
      name: 'plugspace-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      cwd: './apps/admin',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      autorestart: true,
    },
  ],
};
