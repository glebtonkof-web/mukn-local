#!/bin/bash
# МУКН | Трафик - Установка как systemd сервис
# Запуск: sudo ./scripts/install-service.sh

set -e

APP_NAME="mukn-traffic"
APP_DIR="/opt/mukn-traffic"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

echo "=== Installing $APP_NAME as systemd service ==="

# Проверка прав
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Создание директорий
echo "Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/backups"
mkdir -p "$APP_DIR/db"

# Копирование файла сервиса
echo "Installing service file..."
cp deploy/mukn-traffic.service "$SERVICE_FILE"

# Создание пользователя если не существует
if ! id -u www-data >/dev/null 2>&1; then
    echo "Creating www-data user..."
    useradd -r -s /bin/false www-data
fi

# Установка прав
echo "Setting permissions..."
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod +x scripts/*.sh 2>/dev/null || true

# Установка переменных окружения
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating .env file..."
    cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./db/custom.db

# Telegram Bot (optional)
# TELEGRAM_BOT_TOKEN=your_bot_token
# TELEGRAM_CHAT_ID=your_chat_id

# Alert Webhook (optional)
# ALERT_WEBHOOK_URL=https://your-webhook.com/alerts

# Watchdog configuration
WATCHDOG_HEALTH_URL=http://localhost:3000/api/health
WATCHDOG_INTERVAL=30000
WATCHDOG_MAX_FAILURES=3
WATCHDOG_AUTO_RESTART=true
EOF
    echo "Please edit $APP_DIR/.env with your configuration"
fi

# Установка logrotate
echo "Installing logrotate configuration..."
cat > /etc/logrotate.d/$APP_NAME << EOF
$APP_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload $APP_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

# Перезагрузка systemd
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Включение автозапуска
echo "Enabling service..."
systemctl enable $APP_NAME

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Commands:"
echo "  sudo systemctl start $APP_NAME   - Start service"
echo "  sudo systemctl stop $APP_NAME    - Stop service"
echo "  sudo systemctl status $APP_NAME  - Check status"
echo "  sudo journalctl -u $APP_NAME -f  - Follow logs"
echo ""
echo "Configuration:"
echo "  Edit $APP_DIR/.env to set environment variables"
echo ""
echo "Next steps:"
echo "  1. Copy your application to $APP_DIR"
echo "  2. Run 'npm install && npm run build'"
echo "  3. Run 'sudo systemctl start $APP_NAME'"
