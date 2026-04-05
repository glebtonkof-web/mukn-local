"""
Utility functions for DeepSeek Free service
"""

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

import yaml
from loguru import logger


def load_config(config_path: str = "./config.yaml") -> Dict[str, Any]:
    """Load configuration from YAML file"""
    path = Path(config_path)
    
    if not path.exists():
        logger.warning(f"Config file not found: {config_path}")
        return {}
    
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def save_config(config: Dict[str, Any], config_path: str = "./config.yaml"):
    """Save configuration to YAML file"""
    path = Path(config_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)


def setup_logging(
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    rotation: str = "10 MB",
):
    """Setup loguru logging"""
    # Remove default handler
    logger.remove()
    
    # Console handler
    logger.add(
        sink=lambda msg: print(msg, end=""),
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
               "<level>{message}</level>",
    )
    
    # File handler
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            sink=log_file,
            level=log_level,
            rotation=rotation,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        )


def hash_string(s: str) -> str:
    """Hash string using SHA256"""
    return hashlib.sha256(s.encode()).hexdigest()


def encrypt_data(data: str, key: Optional[str] = None) -> str:
    """Simple encryption (for demo - use proper crypto in production)"""
    from cryptography.fernet import Fernet
    
    if key is None:
        key = os.getenv('ENCRYPTION_KEY', 'default-key-for-demo-only')
    
    # Derive key
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'deepseek-salt',
        iterations=100000,
    )
    
    key_bytes = base64.urlsafe_b64encode(kdf.derive(key.encode()))
    fernet = Fernet(key_bytes)
    
    return fernet.encrypt(data.encode()).decode()


def decrypt_data(encrypted: str, key: Optional[str] = None) -> str:
    """Decrypt data"""
    from cryptography.fernet import Fernet
    
    if key is None:
        key = os.getenv('ENCRYPTION_KEY', 'default-key-for-demo-only')
    
    # Derive key
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'deepseek-salt',
        iterations=100000,
    )
    
    key_bytes = base64.urlsafe_b64encode(kdf.derive(key.encode()))
    fernet = Fernet(key_bytes)
    
    return fernet.decrypt(encrypted.encode()).decode()


def calculate_cost(tokens_in: int, tokens_out: int) -> float:
    """Calculate estimated cost (for savings tracking)"""
    # DeepSeek API pricing (approximate)
    cost_per_1k_in = 0.001  # $0.001 per 1K input tokens
    cost_per_1k_out = 0.002  # $0.002 per 1K output tokens
    
    cost = (tokens_in / 1000 * cost_per_1k_in) + (tokens_out / 1000 * cost_per_1k_out)
    return cost


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}m"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}h"


def format_number(n: int) -> str:
    """Format number with K/M suffix"""
    if n >= 1000000:
        return f"{n / 1000000:.1f}M"
    elif n >= 1000:
        return f"{n / 1000:.1f}K"
    return str(n)
