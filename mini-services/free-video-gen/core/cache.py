"""
Free Video Generator - Cache System
Multi-level cache for generated videos and metadata
"""

import os
import json
import shutil
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import asyncio
import aiosqlite

from loguru import logger


class VideoCache:
    """
    Multi-level cache for video generation.
    L1: Memory cache for quick access
    L2: SQLite database for metadata
    L3: File system for video files
    """
    
    def __init__(
        self,
        cache_dir: str = "./cache/videos",
        max_size_gb: float = 5.0,
        ttl_hours: int = 24
    ):
        self.cache_dir = Path(cache_dir)
        self.max_size_bytes = int(max_size_gb * 1024 * 1024 * 1024)
        self.ttl = timedelta(hours=ttl_hours)
        
        # L1: Memory cache
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        
        # L2: Database path
        self._db_path = self.cache_dir / "cache.db"
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """Initialize the cache system"""
        # Create cache directories
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        (self.cache_dir / "videos").mkdir(exist_ok=True)
        
        # Initialize database
        await self._init_db()
        
        # Clean up expired entries
        await self._cleanup_expired()
        
        logger.info(f"Video cache initialized at {self.cache_dir}")
    
    async def _init_db(self):
        """Initialize SQLite database"""
        async with aiosqlite.connect(self._db_path) as db:
            await db.execute('''
                CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    prompt TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    video_path TEXT,
                    duration REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0,
                    metadata TEXT
                )
            ''')
            
            await db.execute('''
                CREATE INDEX IF NOT EXISTS idx_prompt ON cache_entries(prompt)
            ''')
            
            await db.execute('''
                CREATE INDEX IF NOT EXISTS idx_created ON cache_entries(created_at)
            ''')
            
            await db.commit()
    
    def _generate_key(self, prompt: str, provider: str, duration: float) -> str:
        """Generate cache key from parameters"""
        content = f"{prompt}|{provider}|{duration}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    async def get(
        self,
        prompt: str,
        provider: str,
        duration: float = 10.0
    ) -> Optional[Dict[str, Any]]:
        """Get cached video if available"""
        key = self._generate_key(prompt, provider, duration)
        
        # Check L1 memory cache
        if key in self._memory_cache:
            entry = self._memory_cache[key]
            logger.debug(f"Cache hit (L1): {key}")
            return entry
        
        # Check L2 database
        async with self._lock:
            async with aiosqlite.connect(self._db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    'SELECT * FROM cache_entries WHERE cache_key = ?', (key,)
                )
                row = await cursor.fetchone()
                
                if row:
                    # Check if video file exists
                    video_path = Path(row['video_path'])
                    if video_path.exists():
                        entry = {
                            'key': key,
                            'prompt': row['prompt'],
                            'provider': row['provider'],
                            'video_path': row['video_path'],
                            'duration': row['duration'],
                            'metadata': json.loads(row['metadata'] or '{}')
                        }
                        
                        # Update access stats
                        await db.execute(
                            '''UPDATE cache_entries 
                               SET last_accessed = ?, access_count = access_count + 1
                               WHERE cache_key = ?''',
                            (datetime.utcnow().isoformat(), key)
                        )
                        await db.commit()
                        
                        # Store in L1 cache
                        self._memory_cache[key] = entry
                        
                        logger.debug(f"Cache hit (L2): {key}")
                        return entry
                    
                    # Video file missing, remove from DB
                    await db.execute('DELETE FROM cache_entries WHERE cache_key = ?', (key,))
                    await db.commit()
        
        logger.debug(f"Cache miss: {key}")
        return None
    
    async def set(
        self,
        prompt: str,
        provider: str,
        video_path: str,
        duration: float,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Store video in cache"""
        key = self._generate_key(prompt, provider, duration)
        
        # Copy video to cache directory
        cache_video_path = self.cache_dir / "videos" / f"{key}.mp4"
        shutil.copy2(video_path, cache_video_path)
        
        entry = {
            'key': key,
            'prompt': prompt,
            'provider': provider,
            'video_path': str(cache_video_path),
            'duration': duration,
            'metadata': metadata or {}
        }
        
        # Store in L1 cache
        self._memory_cache[key] = entry
        
        # Store in L2 database
        async with self._lock:
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute(
                    '''INSERT OR REPLACE INTO cache_entries 
                       (cache_key, prompt, provider, video_path, duration, metadata)
                       VALUES (?, ?, ?, ?, ?, ?)''',
                    (key, prompt, provider, str(cache_video_path), duration, json.dumps(metadata or {}))
                )
                await db.commit()
        
        logger.debug(f"Cached video: {key}")
        
        # Check cache size and cleanup if needed
        await self._check_size()
        
        return key
    
    async def delete(self, key: str) -> bool:
        """Delete entry from cache"""
        # Remove from L1
        if key in self._memory_cache:
            del self._memory_cache[key]
        
        # Remove from L2 and L3
        async with self._lock:
            async with aiosqlite.connect(self._db_path) as db:
                cursor = await db.execute(
                    'SELECT video_path FROM cache_entries WHERE cache_key = ?', (key,)
                )
                row = await cursor.fetchone()
                
                if row:
                    video_path = Path(row[0])
                    if video_path.exists():
                        video_path.unlink()
                    
                    await db.execute('DELETE FROM cache_entries WHERE cache_key = ?', (key,))
                    await db.commit()
                    
                    logger.debug(f"Deleted cache entry: {key}")
                    return True
        
        return False
    
    async def find_similar(
        self,
        prompt: str,
        threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Find similar cached videos based on prompt similarity"""
        results = []
        prompt_lower = prompt.lower()
        prompt_words = set(prompt_lower.split())
        
        async with aiosqlite.connect(self._db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute('SELECT * FROM cache_entries')
            rows = await cursor.fetchall()
            
            for row in rows:
                cached_prompt = row['prompt'].lower()
                cached_words = set(cached_prompt.split())
                
                # Calculate Jaccard similarity
                intersection = len(prompt_words & cached_words)
                union = len(prompt_words | cached_words)
                
                if union > 0:
                    similarity = intersection / union
                    
                    if similarity >= threshold:
                        results.append({
                            'key': row['cache_key'],
                            'prompt': row['prompt'],
                            'provider': row['provider'],
                            'video_path': row['video_path'],
                            'duration': row['duration'],
                            'similarity': similarity
                        })
        
        # Sort by similarity
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_size = 0
        video_count = 0
        
        video_dir = self.cache_dir / "videos"
        if video_dir.exists():
            for f in video_dir.iterdir():
                if f.is_file() and f.suffix == '.mp4':
                    total_size += f.stat().st_size
                    video_count += 1
        
        async with aiosqlite.connect(self._db_path) as db:
            cursor = await db.execute('SELECT COUNT(*) FROM cache_entries')
            db_count = (await cursor.fetchone())[0]
        
        return {
            'video_count': video_count,
            'db_count': db_count,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'max_size_gb': self.max_size_bytes / (1024 * 1024 * 1024),
            'usage_percent': round(total_size / self.max_size_bytes * 100, 1),
            'l1_entries': len(self._memory_cache)
        }
    
    async def clear(self):
        """Clear all cache"""
        # Clear L1
        self._memory_cache.clear()
        
        # Clear L2 and L3
        async with self._lock:
            video_dir = self.cache_dir / "videos"
            if video_dir.exists():
                for f in video_dir.iterdir():
                    if f.is_file():
                        f.unlink()
            
            async with aiosqlite.connect(self._db_path) as db:
                await db.execute('DELETE FROM cache_entries')
                await db.commit()
        
        logger.info("Cache cleared")
    
    async def _check_size(self):
        """Check cache size and cleanup if over limit"""
        stats = await self.get_stats()
        
        if stats['usage_percent'] > 90:
            logger.warning(f"Cache usage at {stats['usage_percent']}%, cleaning up...")
            await self._cleanup_old_entries()
    
    async def _cleanup_expired(self):
        """Remove expired cache entries"""
        cutoff = datetime.utcnow() - self.ttl
        
        async with aiosqlite.connect(self._db_path) as db:
            cursor = await db.execute(
                'SELECT cache_key, video_path FROM cache_entries WHERE created_at < ?',
                (cutoff.isoformat(),)
            )
            rows = await cursor.fetchall()
            
            for key, video_path in rows:
                path = Path(video_path)
                if path.exists():
                    path.unlink()
                
                await db.execute('DELETE FROM cache_entries WHERE cache_key = ?', (key,))
                
                if key in self._memory_cache:
                    del self._memory_cache[key]
            
            await db.commit()
            
            if rows:
                logger.info(f"Cleaned up {len(rows)} expired cache entries")
    
    async def _cleanup_old_entries(self):
        """Remove oldest entries to free space"""
        async with aiosqlite.connect(self._db_path) as db:
            # Get oldest 25% of entries
            cursor = await db.execute(
                '''SELECT cache_key, video_path FROM cache_entries 
                   ORDER BY last_accessed ASC 
                   LIMIT (SELECT COUNT(*) / 4 FROM cache_entries)'''
            )
            rows = await cursor.fetchall()
            
            for key, video_path in rows:
                path = Path(video_path)
                if path.exists():
                    path.unlink()
                
                await db.execute('DELETE FROM cache_entries WHERE cache_key = ?', (key,))
                
                if key in self._memory_cache:
                    del self._memory_cache[key]
            
            await db.commit()
            
            if rows:
                logger.info(f"Cleaned up {len(rows)} old cache entries")
