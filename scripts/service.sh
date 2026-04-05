#!/bin/bash
# МУКН | Трафик - Управление сервисом
# Использование: ./scripts/service.sh {start|stop|restart|status|logs|health}

set -e

# Конфигурация
APP_NAME="mukn-traffic"
APP_DIR="/opt/mukn-traffic"
LOG_DIR="$APP_DIR/logs"
PID_FILE="$APP_DIR/.pid"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_pm2() {
    command -v pm2 >/dev/null 2>&1
}

check_systemd() {
    systemctl is-active --quiet mukn-traffic 2>/dev/null
}

check_node() {
    pgrep -f "node.*server.js" >/dev/null 2>&1
}

get_status() {
    if check_pm2 && pm2 list | grep -q "$APP_NAME"; then
        echo "pm2"
    elif check_systemd; then
        echo "systemd"
    elif check_node; then
        echo "node"
    else
        echo "stopped"
    fi
}

start_service() {
    log_info "Starting $APP_NAME..."
    
    local status=$(get_status)
    if [ "$status" != "stopped" ]; then
        log_warning "Service is already running (mode: $status)"
        return 0
    fi
    
    cd "$APP_DIR"
    
    if check_pm2; then
        log_info "Starting with PM2..."
        pm2 start ecosystem.config.js --env production
        pm2 save
    elif [ -f /etc/systemd/system/mukn-traffic.service ]; then
        log_info "Starting with systemd..."
        sudo systemctl start mukn-traffic
    else
        log_info "Starting with node..."
        nohup node .next/standalone/server.js > "$LOG_DIR/out.log" 2> "$LOG_DIR/error.log" &
        echo $! > "$PID_FILE"
    fi
    
    sleep 3
    
    if [ "$(get_status)" != "stopped" ]; then
        log_success "Service started successfully"
    else
        log_error "Failed to start service"
        return 1
    fi
}

stop_service() {
    log_info "Stopping $APP_NAME..."
    
    local status=$(get_status)
    
    case $status in
        pm2)
            pm2 stop "$APP_NAME"
            ;;
        systemd)
            sudo systemctl stop mukn-traffic
            ;;
        node)
            if [ -f "$PID_FILE" ]; then
                kill $(cat "$PID_FILE") 2>/dev/null || true
                rm -f "$PID_FILE"
            else
                pkill -f "node.*server.js"
            fi
            ;;
        stopped)
            log_warning "Service is not running"
            return 0
            ;;
    esac
    
    sleep 2
    log_success "Service stopped"
}

restart_service() {
    log_info "Restarting $APP_NAME..."
    stop_service
    sleep 2
    start_service
}

show_status() {
    local status=$(get_status)
    
    echo ""
    echo "=== $APP_NAME Status ==="
    echo "Mode: $status"
    
    case $status in
        pm2)
            pm2 list
            ;;
        systemd)
            sudo systemctl status mukn-traffic --no-pager
            ;;
        node)
            if [ -f "$PID_FILE" ]; then
                local pid=$(cat "$PID_FILE")
                echo "PID: $pid"
                ps -p $pid -o pid,ppid,%cpu,%mem,etime,cmd 2>/dev/null || echo "Process not found"
            fi
            ;;
        stopped)
            echo "Service is not running"
            ;;
    esac
    
    echo ""
    echo "=== Health Check ==="
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || echo "Health endpoint not available"
    echo ""
}

show_logs() {
    local lines=${1:-100}
    log_info "Showing last $lines lines of logs..."
    
    if [ -f "$LOG_DIR/out.log" ]; then
        echo "=== stdout (last $lines lines) ==="
        tail -n $lines "$LOG_DIR/out.log"
    fi
    
    if [ -f "$LOG_DIR/error.log" ]; then
        echo ""
        echo "=== stderr (last $lines lines) ==="
        tail -n $lines "$LOG_DIR/error.log"
    fi
}

show_health() {
    log_info "Checking health..."
    
    local response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Health check passed"
        echo "$body" | jq .
    else
        log_error "Health check failed (HTTP $http_code)"
        echo "$body"
    fi
}

# Главная логика
case "${1:-}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs ${2:-100}
        ;;
    health)
        show_health
        ;;
    enable)
        log_info "Enabling service for autostart..."
        if check_pm2; then
            pm2 startup
            pm2 save
        elif [ -f /etc/systemd/system/mukn-traffic.service ]; then
            sudo systemctl enable mukn-traffic
        else
            log_warning "No service manager detected"
        fi
        ;;
    disable)
        log_info "Disabling service autostart..."
        if check_pm2; then
            pm2 unstartup
        elif [ -f /etc/systemd/system/mukn-traffic.service ]; then
            sudo systemctl disable mukn-traffic
        fi
        ;;
    backup)
        log_info "Creating backup..."
        cd "$APP_DIR"
        npx ts-node scripts/backup.ts
        ;;
    restore)
        log_info "Restoring from backup..."
        cd "$APP_DIR"
        npx ts-node scripts/restore.ts "${2:-}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|health|enable|disable|backup|restore}"
        echo ""
        echo "Commands:"
        echo "  start     - Start the service"
        echo "  stop      - Stop the service"
        echo "  restart   - Restart the service"
        echo "  status    - Show service status"
        echo "  logs [N]  - Show last N lines of logs (default: 100)"
        echo "  health    - Check service health"
        echo "  enable    - Enable autostart on boot"
        echo "  disable   - Disable autostart on boot"
        echo "  backup    - Create database backup"
        echo "  restore   - Restore from backup"
        exit 1
        ;;
esac
