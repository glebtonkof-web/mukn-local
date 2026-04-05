#!/bin/bash
# Content Studio Infinite - Start Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Content Studio Infinite ===${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 not found. Please install Python 3.9+${NC}"
    exit 1
fi

# Check pip packages
if ! python3 -c "import playwright" 2>/dev/null; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pip install -r requirements.txt
    playwright install chromium
fi

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}Warning: FFmpeg not found. Video stitching will not work.${NC}"
    echo -e "${YELLOW}Install with: sudo apt install ffmpeg${NC}"
fi

# Create directories
mkdir -p data/accounts data/queue data/videos/raw data/videos/final data/logs

# Parse arguments
MODE="${1:-server}"
shift || true

case "$MODE" in
    server)
        echo -e "${GREEN}Starting API server on port 8767...${NC}"
        python3 main.py --server --host 0.0.0.0 --port 8767 "$@"
        ;;
    generate)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./start.sh generate \"prompt\"${NC}"
            exit 1
        fi
        python3 main.py --generate "$1" "$@"
        ;;
    batch)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./start.sh batch prompts.txt${NC}"
            exit 1
        fi
        python3 main.py --batch "$1" "$@"
        ;;
    register)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./start.sh register <provider>${NC}"
            echo "Providers: kling, wan, digen, qwen, runway, luma, pika, haiper, vidu"
            exit 1
        fi
        python3 main.py --register "$1" --no-headless "$@"
        ;;
    stitch)
        if [ -z "$1" ]; then
            echo -e "${RED}Usage: ./start.sh stitch videos.txt${NC}"
            exit 1
        fi
        python3 main.py --stitch "$1" "$@"
        ;;
    status)
        python3 main.py --status
        ;;
    *)
        echo -e "${RED}Unknown mode: $MODE${NC}"
        echo "Usage: ./start.sh {server|generate|batch|register|stitch|status}"
        exit 1
        ;;
esac
