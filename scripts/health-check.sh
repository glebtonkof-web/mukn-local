#!/bin/bash
# МУКН | Трафик - Быстрая проверка здоровья
# Использование: ./scripts/health-check.sh [url]

set -e

URL="${1:-http://localhost:3000/api/health}"
TIMEOUT=10

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Health check: $URL"

# Выполняем запрос с таймаутом
RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" --max-time $TIMEOUT "$URL" 2>&1 || echo "FAILED")
HTTP_CODE=$(echo "$RESPONSE" | head -n -2 | tail -n 1)
RESPONSE_TIME=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -3)

# Проверяем результат
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}[HEALTHY]${NC} Status: $HTTP_CODE, Time: ${RESPONSE_TIME}s"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    exit 0
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}[UNREACHABLE]${NC} Cannot connect to $URL"
    exit 2
else
    echo -e "${RED}[UNHEALTHY]${NC} Status: $HTTP_CODE"
    echo "$BODY"
    exit 1
fi
