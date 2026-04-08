// PM2 Ecosystem Configuration for МУКН
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'mukn-web',
      script: 'npm',
      args: 'start',
      cwd: '/home/z/my-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development'
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 30,
      min_uptime: '10s',
      
      // Health check
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000
    },
    {
      name: 'mukn-scheduler',
      script: './scripts/scheduler.js',
      cwd: '/home/z/my-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log'
    },
    {
      name: 'mukn-watchdog',
      script: './scripts/watchdog.ts',
      cwd: '/home/z/my-project',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/watchdog-error.log',
      out_file: './logs/watchdog-out.log'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['localhost'],
      ref: 'origin/main',
      repo: 'git@github.com:glebtonkof-web/mukn-local.git',
      path: '/var/www/mukn',
      'post-deploy': 'npm install && npx prisma generate && npx prisma db push && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git nodejs npm -y'
    }
  }
};
