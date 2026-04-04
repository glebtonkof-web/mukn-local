"""
DeepSeek Free Service - Main Entry Point
Industrial-grade free access to DeepSeek
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger

from core import (
    DeepSeekPool,
    LoadBalancer,
    MultiLevelCache,
    SmartQueue,
    AutoRegistrar,
    SelfHealingManager,
    HealthChecker,
)
from core.utils import load_config, setup_logging
from api.server import app
import uvicorn


async def main():
    """Main entry point"""
    # Load configuration
    config = load_config()
    
    # Setup logging
    log_level = os.getenv('LOG_LEVEL', config.get('log_level', 'INFO'))
    log_file = config.get('log_file', './logs/deepseek-free.log')
    setup_logging(log_level, log_file)
    
    logger.info("=" * 60)
    logger.info("DeepSeek Free Industrial Service")
    logger.info("=" * 60)
    
    # Create data directory
    Path('./data').mkdir(exist_ok=True)
    
    # Start HTTP server
    port = int(os.getenv('PORT', config.get('port', 8765)))
    
    logger.info(f"Starting HTTP server on port {port}")
    
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
    
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
