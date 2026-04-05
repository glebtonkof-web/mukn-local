/**
 * PM2 Ecosystem Configuration
 * МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
 * 
 * Использование:
 *   pm2 start ecosystem.config.js
 *   pm2 restart all
 *   pm2 stop all
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'mukn-traffic',
      script: '.next/standalone/server.js',
      cwd: '/opt/mukn-traffic',

      // Режим работы
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      interpreter: 'node',

      // Переменные окружения
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },

      // Переменные окружения для разработки
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // Автоматический перезапуск
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',

      // Перезапуск при падении
      restart_delay: 5000,
      max_restarts: 30,
      min_uptime: '10s',
      kill_timeout: 30000,
      listen_timeout: 10000,

      // Cron для периодического перезапуска (опционально)
      // cron_restart: '0 3 * * *', // каждый день в 3:00

      // Логирование
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/mukn-traffic/logs/error.log',
      out_file: '/opt/mukn-traffic/logs/out.log',
      merge_logs: true,

      // Время сохранения логов
      log_type: 'json',

      // Instance name для кластера
      instance_var: 'INSTANCE_ID',

      // Shutdown hook
      post_update: ['npm install'],

      // Health check
      instance_var: 'NODE_APP_INSTANCE',
    },

    // Дополнительный сервис для мониторинга
    {
      name: 'mukn-watchdog',
      script: 'scripts/watchdog.js',
      cwd: '/opt/mukn-traffic',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 10000,
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/opt/mukn-traffic/logs/watchdog-error.log',
      out_file: '/opt/mukn-traffic/logs/watchdog.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  // Деплой конфигурация
  deploy: {
    production: {
      user: 'deploy',
      host: ['localhost'],
      ref: 'origin/main',
      repo: 'git@github.com:mukn/traffic.git',
      path: '/opt/mukn-traffic',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y',
    },
    staging: {
      user: 'deploy',
      host: ['localhost'],
      ref: 'origin/develop',
      repo: 'git@github.com:mukn/traffic.git',
      path: '/opt/mukn-traffic-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env development',
    },
  },
};
