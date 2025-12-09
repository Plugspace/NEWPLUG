// ==============================================
// PLUGSPACE.IO TITAN v1.4 - PM2 CONFIGURATION
// ==============================================

module.exports = {
  apps: [
    // API Server
    {
      name: 'plugspace-api',
      script: 'dist/index.js',
      cwd: '/var/www/plugspace/apps/api',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Health monitoring
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
    },

    // Landing Page
    {
      name: 'plugspace-landing',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/plugspace/apps/landing',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/landing-error.log',
      out_file: '/var/log/pm2/landing-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Studio
    {
      name: 'plugspace-studio',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/var/www/plugspace/apps/studio',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/studio-error.log',
      out_file: '/var/log/pm2/studio-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Admin Dashboard
    {
      name: 'plugspace-admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3002',
      cwd: '/var/www/plugspace/apps/admin',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/pm2/admin-error.log',
      out_file: '/var/log/pm2/admin-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['plugspace.io'],
      ref: 'origin/main',
      repo: 'git@github.com:plugspace/titan.git',
      path: '/var/www/plugspace',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
};
