// ==============================================
// PLUGSPACE.IO TITAN v1.4 - PM2 ECOSYSTEM CONFIG
// ==============================================
// Production process management configuration
// ==============================================

module.exports = {
  apps: [
    // ===========================================
    // FRONTEND (Next.js Landing)
    // ===========================================
    {
      name: 'plugspace-frontend',
      cwd: './apps/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/frontend-error.log',
      out_file: '/var/log/pm2/frontend-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ===========================================
    // STUDIO (Next.js User App)
    // ===========================================
    {
      name: 'plugspace-studio',
      cwd: './apps/studio',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/studio-error.log',
      out_file: '/var/log/pm2/studio-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ===========================================
    // MASTER ADMIN (Next.js Admin Dashboard)
    // ===========================================
    {
      name: 'plugspace-admin',
      cwd: './apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/pm2/admin-error.log',
      out_file: '/var/log/pm2/admin-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // ===========================================
    // BACKEND API (tRPC)
    // ===========================================
    {
      name: 'plugspace-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      instances: 4,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/log/pm2/api-error.log',
      out_file: '/var/log/pm2/api-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      // Health check
      exp_backoff_restart_delay: 100,
    },

    // ===========================================
    // VOICE SERVER (WebSocket)
    // ===========================================
    {
      name: 'plugspace-voice',
      cwd: './apps/server',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        VOICE_SERVER_PORT: 4001,
      },
      error_file: '/var/log/pm2/voice-error.log',
      out_file: '/var/log/pm2/voice-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 30000, // Longer timeout for WebSocket connections
      wait_ready: true,
      listen_timeout: 10000,
    },

    // ===========================================
    // QUEUE WORKERS (BullMQ)
    // ===========================================
    {
      name: 'plugspace-worker',
      cwd: './apps/api',
      script: 'dist/queue/workers/index.js',
      instances: 4,
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'true',
      },
      error_file: '/var/log/pm2/worker-error.log',
      out_file: '/var/log/pm2/worker-out.log',
      merge_logs: true,
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown for job completion
      kill_timeout: 60000,
    },
  ],

  // ===========================================
  // DEPLOYMENT CONFIGURATION
  // ===========================================
  deploy: {
    production: {
      user: 'plugspace',
      host: ['plugspace.io'],
      ref: 'origin/main',
      repo: 'git@github.com:plugspace/titan.git',
      path: '/home/plugspace/plugspace',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      ssh_options: ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'plugspace',
      host: ['staging.plugspace.io'],
      ref: 'origin/develop',
      repo: 'git@github.com:plugspace/titan.git',
      path: '/home/plugspace/plugspace',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
