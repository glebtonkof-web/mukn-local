"""
Free Video Generator - Utility Functions
Common utilities used across the module
"""

import os
import json
import hashlib
import random
import string
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

import yaml
from loguru import logger


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration from YAML file"""
    if config_path is None:
        config_path = os.getenv(
            'VIDEO_GEN_CONFIG',
            str(Path(__file__).parent.parent / 'config.yaml')
        )
    
    config_path = Path(config_path)
    
    if not config_path.exists():
        logger.warning(f"Config file not found: {config_path}, using defaults")
        return get_default_config()
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    # Override with environment variables
    config = apply_env_overrides(config)
    
    return config


def get_default_config() -> Dict[str, Any]:
    """Get default configuration"""
    return {
        'server': {
            'host': '0.0.0.0',
            'port': 8766,
            'workers': 4
        },
        'providers': {
            'kling': {
                'enabled': True,
                'url': 'https://klingai.com',
                'daily_credits': 100,
                'max_requests_per_hour': 5,
                'priority': 1
            },
            'luma': {
                'enabled': True,
                'url': 'https://lumalabs.ai/dream-machine',
                'monthly_limit': 30,
                'priority': 2
            },
            'runway': {
                'enabled': True,
                'url': 'https://runwayml.com',
                'initial_credits': 125,
                'priority': 3
            }
        },
        'video': {
            'default_duration': 10,
            'default_ratio': '9:16',
            'output_dir': './output/videos',
            'temp_dir': './output/temp'
        },
        'queue': {
            'max_workers': 3,
            'max_retries': 3
        },
        'logging': {
            'level': 'INFO',
            'file': './logs/free-video-gen.log'
        }
    }


def apply_env_overrides(config: Dict[str, Any]) -> Dict[str, Any]:
    """Apply environment variable overrides to config"""
    
    # Server
    if os.getenv('SERVER_HOST'):
        config['server']['host'] = os.getenv('SERVER_HOST')
    if os.getenv('SERVER_PORT'):
        config['server']['port'] = int(os.getenv('SERVER_PORT'))
    
    # Video
    if os.getenv('OUTPUT_DIR'):
        config['video']['output_dir'] = os.getenv('OUTPUT_DIR')
    if os.getenv('TEMP_DIR'):
        config['video']['temp_dir'] = os.getenv('TEMP_DIR')
    
    # Logging
    if os.getenv('LOG_LEVEL'):
        config['logging']['level'] = os.getenv('LOG_LEVEL')
    
    return config


def setup_logging(level: str = "INFO", log_file: Optional[str] = None):
    """Setup loguru logging"""
    import sys
    
    # Remove default handler
    logger.remove()
    
    # Add console handler with colors
    logger.add(
        sys.stdout,
        level=level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
        colorize=True
    )
    
    # Add file handler if specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.add(
            log_file,
            level=level,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function} - {message}",
            rotation="10 MB",
            retention="7 days",
            compression="zip"
        )


def get_timestamp() -> str:
    """Get current timestamp string"""
    return datetime.utcnow().strftime("%Y%m%d_%H%M%S")


def generate_id(length: int = 8) -> str:
    """Generate random alphanumeric ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def sanitize_filename(name: str) -> str:
    """Sanitize string for use as filename"""
    # Replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    
    # Remove leading/trailing spaces and dots
    name = name.strip('. ')
    
    # Limit length
    if len(name) > 100:
        name = name[:100]
    
    return name or 'untitled'


def ensure_dir(path: str) -> Path:
    """Ensure directory exists, create if needed"""
    dir_path = Path(path)
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def calculate_hash(data: Any) -> str:
    """Calculate SHA256 hash of data"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    elif not isinstance(data, bytes):
        data = json.dumps(data, sort_keys=True).encode('utf-8')
    
    return hashlib.sha256(data).hexdigest()[:16]


async def run_ffmpeg(args: list, timeout: int = 300) -> tuple:
    """Run FFmpeg command asynchronously"""
    import asyncio
    
    cmd = ['ffmpeg', '-y'] + args
    
    logger.debug(f"Running FFmpeg: {' '.join(cmd)}")
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=timeout
        )
        
        if process.returncode != 0:
            error_msg = stderr.decode('utf-8', errors='ignore')
            logger.error(f"FFmpeg error: {error_msg}")
            return False, error_msg
        
        return True, stdout.decode('utf-8', errors='ignore')
        
    except asyncio.TimeoutError:
        process.kill()
        logger.error("FFmpeg timeout")
        return False, "FFmpeg command timed out"


async def download_file(url: str, output_path: str, timeout: int = 120) -> bool:
    """Download file from URL"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as response:
                if response.status != 200:
                    logger.error(f"Download failed: {response.status}")
                    return False
                
                # Ensure directory exists
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                
                logger.debug(f"Downloaded: {output_path}")
                return True
                
    except Exception as e:
        logger.error(f"Download error: {e}")
        return False


def format_duration(seconds: float) -> str:
    """Format duration in seconds to HH:MM:SS format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def parse_duration(duration_str: str) -> float:
    """Parse duration string to seconds"""
    parts = duration_str.split(':')
    
    if len(parts) == 3:
        return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1])
    else:
        return float(parts[0])


def get_video_info(video_path: str) -> Optional[Dict[str, Any]]:
    """Get video metadata using ffprobe"""
    import subprocess
    import json
    
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            return None
        
        data = json.loads(result.stdout)
        
        # Extract video stream info
        video_stream = None
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'video':
                video_stream = stream
                break
        
        if not video_stream:
            return None
        
        return {
            'duration': float(data['format'].get('duration', 0)),
            'width': video_stream.get('width', 0),
            'height': video_stream.get('height', 0),
            'fps': eval(video_stream.get('r_frame_rate', '0/1')),
            'codec': video_stream.get('codec_name', ''),
            'bitrate': int(data['format'].get('bit_rate', 0)),
        }
        
    except Exception as e:
        logger.error(f"Failed to get video info: {e}")
        return None
