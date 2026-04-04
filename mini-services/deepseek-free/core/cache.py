"""
Multi-Level Cache with Semantic Search
L1 (RAM) + L2 (SQLite) + L3 (File) caching with vector similarity
"""

import asyncio
import hashlib
import json
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
import aiofiles
import aiosqlite
from loguru import logger

# Vector search imports
try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("sentence-transformers not installed. Semantic search disabled.")


@dataclass
class CacheEntry:
    """Cache entry"""
    prompt_hash: str
    prompt: str
    response: str
    created_at: datetime
    expires_at: datetime
    hit_count: int = 0
    last_hit_at: Optional[datetime] = None
    model_used: Optional[str] = None
    response_time: Optional[float] = None
    embedding: Optional[List[float]] = None


class CacheLevel(ABC):
    """Abstract cache level"""
    
    @abstractmethod
    async def get(self, prompt_hash: str) -> Optional[CacheEntry]:
        pass
    
    @abstractmethod
    async def set(self, entry: CacheEntry) -> bool:
        pass
    
    @abstractmethod
    async def delete(self, prompt_hash: str) -> bool:
        pass
    
    @abstractmethod
    async def clear(self) -> int:
        pass
    
    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        pass


class L1Cache(CacheLevel):
    """
    L1 Cache - In-memory LRU cache.
    Fastest access, limited size.
    """
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, CacheEntry] = {}
        self._access_order: List[str] = []
        self._hits = 0
        self._misses = 0
    
    async def get(self, prompt_hash: str) -> Optional[CacheEntry]:
        entry = self._cache.get(prompt_hash)
        
        if not entry:
            self._misses += 1
            return None
        
        # Check expiry
        if datetime.now() > entry.expires_at:
            await self.delete(prompt_hash)
            self._misses += 1
            return None
        
        # Update access order (move to end)
        if prompt_hash in self._access_order:
            self._access_order.remove(prompt_hash)
        self._access_order.append(prompt_hash)
        
        # Update hit stats
        entry.hit_count += 1
        entry.last_hit_at = datetime.now()
        
        self._hits += 1
        return entry
    
    async def set(self, entry: CacheEntry) -> bool:
        # Evict if at capacity
        while len(self._cache) >= self.max_size:
            if self._access_order:
                oldest = self._access_order.pop(0)
                del self._cache[oldest]
            else:
                break
        
        self._cache[entry.prompt_hash] = entry
        self._access_order.append(entry.prompt_hash)
        return True
    
    async def delete(self, prompt_hash: str) -> bool:
        if prompt_hash in self._cache:
            del self._cache[prompt_hash]
            if prompt_hash in self._access_order:
                self._access_order.remove(prompt_hash)
            return True
        return False
    
    async def clear(self) -> int:
        count = len(self._cache)
        self._cache.clear()
        self._access_order.clear()
        return count
    
    async def get_stats(self) -> Dict[str, Any]:
        total = self._hits + self._misses
        hit_rate = self._hits / max(1, total)
        
        return {
            'level': 'L1',
            'size': len(self._cache),
            'max_size': self.max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': hit_rate,
        }


class L2Cache(CacheLevel):
    """
    L2 Cache - SQLite-based persistent cache.
    Medium speed, larger capacity.
    """
    
    def __init__(self, db_path: str = "cache.db", ttl_seconds: int = 86400):
        self.db_path = db_path
        self.ttl_seconds = ttl_seconds
        self._db: Optional[aiosqlite.Connection] = None
        self._initialized = False
    
    async def _init_db(self):
        if self._initialized:
            return
        
        self._db = await aiosqlite.connect(self.db_path)
        
        await self._db.execute('''
            CREATE TABLE IF NOT EXISTS cache (
                prompt_hash TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                hit_count INTEGER DEFAULT 0,
                last_hit_at TIMESTAMP,
                model_used TEXT,
                response_time REAL,
                embedding BLOB
            )
        ''')
        
        await self._db.execute('CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires_at)')
        await self._db.execute('CREATE INDEX IF NOT EXISTS idx_hit_count ON cache(hit_count)')
        
        await self._db.commit()
        self._initialized = True
    
    async def get(self, prompt_hash: str) -> Optional[CacheEntry]:
        await self._init_db()
        
        async with self._db.execute(
            'SELECT * FROM cache WHERE prompt_hash = ?',
            (prompt_hash,)
        ) as cursor:
            row = await cursor.fetchone()
        
        if not row:
            return None
        
        entry = CacheEntry(
            prompt_hash=row[0],
            prompt=row[1],
            response=row[2],
            created_at=datetime.fromisoformat(row[3]),
            expires_at=datetime.fromisoformat(row[4]),
            hit_count=row[5] or 0,
            last_hit_at=datetime.fromisoformat(row[6]) if row[6] else None,
            model_used=row[7],
            response_time=row[8],
        )
        
        # Check expiry
        if datetime.now() > entry.expires_at:
            await self.delete(prompt_hash)
            return None
        
        # Update hit count
        await self._db.execute(
            'UPDATE cache SET hit_count = hit_count + 1, last_hit_at = ? WHERE prompt_hash = ?',
            (datetime.now().isoformat(), prompt_hash)
        )
        await self._db.commit()
        
        return entry
    
    async def set(self, entry: CacheEntry) -> bool:
        await self._init_db()
        
        try:
            # Convert embedding to bytes if present
            embedding_bytes = None
            if entry.embedding:
                embedding_bytes = np.array(entry.embedding, dtype=np.float32).tobytes()
            
            await self._db.execute('''
                INSERT OR REPLACE INTO cache
                (prompt_hash, prompt, response, created_at, expires_at, hit_count, last_hit_at, model_used, response_time, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entry.prompt_hash,
                entry.prompt,
                entry.response,
                entry.created_at.isoformat(),
                entry.expires_at.isoformat(),
                entry.hit_count,
                entry.last_hit_at.isoformat() if entry.last_hit_at else None,
                entry.model_used,
                entry.response_time,
                embedding_bytes,
            ))
            
            await self._db.commit()
            return True
            
        except Exception as e:
            logger.error(f"L2Cache set error: {e}")
            return False
    
    async def delete(self, prompt_hash: str) -> bool:
        await self._init_db()
        
        cursor = await self._db.execute(
            'DELETE FROM cache WHERE prompt_hash = ?',
            (prompt_hash,)
        )
        await self._db.commit()
        
        return cursor.rowcount > 0
    
    async def clear(self) -> int:
        await self._init_db()
        
        cursor = await self._db.execute('SELECT COUNT(*) FROM cache')
        row = await cursor.fetchone()
        count = row[0] if row else 0
        
        await self._db.execute('DELETE FROM cache')
        await self._db.commit()
        
        return count
    
    async def cleanup_expired(self) -> int:
        """Remove expired entries"""
        await self._init_db()
        
        cursor = await self._db.execute(
            'DELETE FROM cache WHERE expires_at < ?',
            (datetime.now().isoformat(),)
        )
        await self._db.commit()
        
        return cursor.rowcount
    
    async def get_stats(self) -> Dict[str, Any]:
        await self._init_db()
        
        cursor = await self._db.execute('SELECT COUNT(*) FROM cache')
        row = await cursor.fetchone()
        size = row[0] if row else 0
        
        cursor = await self._db.execute('SELECT SUM(hit_count) FROM cache')
        row = await cursor.fetchone()
        total_hits = row[0] if row and row[0] else 0
        
        return {
            'level': 'L2',
            'size': size,
            'total_hits': total_hits,
        }
    
    async def close(self):
        if self._db:
            await self._db.close()
            self._db = None
            self._initialized = False


class L3Cache(CacheLevel):
    """
    L3 Cache - File-based cache.
    Slowest, unlimited capacity.
    """
    
    def __init__(self, cache_dir: str = "./cache_l3", ttl_seconds: int = 604800):  # 7 days
        self.cache_dir = Path(cache_dir)
        self.ttl_seconds = ttl_seconds
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_file_path(self, prompt_hash: str) -> Path:
        return self.cache_dir / f"{prompt_hash}.json"
    
    async def get(self, prompt_hash: str) -> Optional[CacheEntry]:
        file_path = self._get_file_path(prompt_hash)
        
        if not file_path.exists():
            return None
        
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                data = json.loads(await f.read())
            
            entry = CacheEntry(
                prompt_hash=data['prompt_hash'],
                prompt=data['prompt'],
                response=data['response'],
                created_at=datetime.fromisoformat(data['created_at']),
                expires_at=datetime.fromisoformat(data['expires_at']),
                hit_count=data.get('hit_count', 0),
                last_hit_at=datetime.fromisoformat(data['last_hit_at']) if data.get('last_hit_at') else None,
                model_used=data.get('model_used'),
                response_time=data.get('response_time'),
            )
            
            # Check expiry
            if datetime.now() > entry.expires_at:
                await self.delete(prompt_hash)
                return None
            
            # Update hit count
            entry.hit_count += 1
            entry.last_hit_at = datetime.now()
            await self.set(entry)
            
            return entry
            
        except Exception as e:
            logger.error(f"L3Cache get error: {e}")
            return None
    
    async def set(self, entry: CacheEntry) -> bool:
        file_path = self._get_file_path(entry.prompt_hash)
        
        try:
            data = {
                'prompt_hash': entry.prompt_hash,
                'prompt': entry.prompt,
                'response': entry.response,
                'created_at': entry.created_at.isoformat(),
                'expires_at': entry.expires_at.isoformat(),
                'hit_count': entry.hit_count,
                'last_hit_at': entry.last_hit_at.isoformat() if entry.last_hit_at else None,
                'model_used': entry.model_used,
                'response_time': entry.response_time,
            }
            
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, ensure_ascii=False, indent=2))
            
            return True
            
        except Exception as e:
            logger.error(f"L3Cache set error: {e}")
            return False
    
    async def delete(self, prompt_hash: str) -> bool:
        file_path = self._get_file_path(prompt_hash)
        
        try:
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"L3Cache delete error: {e}")
            return False
    
    async def clear(self) -> int:
        count = 0
        for file_path in self.cache_dir.glob("*.json"):
            try:
                file_path.unlink()
                count += 1
            except:
                pass
        return count
    
    async def get_stats(self) -> Dict[str, Any]:
        files = list(self.cache_dir.glob("*.json"))
        return {
            'level': 'L3',
            'size': len(files),
        }


class SemanticCacheSearch:
    """
    Semantic search for similar prompts using embeddings.
    Enables finding similar cached responses even with different wording.
    """
    
    def __init__(self, similarity_threshold: float = 0.95):
        self.similarity_threshold = similarity_threshold
        self._model = None
        self._embeddings: Dict[str, np.ndarray] = {}
        
        if EMBEDDINGS_AVAILABLE:
            try:
                self._model = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Semantic search initialized with all-MiniLM-L6-v2")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}")
    
    def is_available(self) -> bool:
        return self._model is not None
    
    async def get_embedding(self, text: str) -> Optional[np.ndarray]:
        """Get embedding for text"""
        if not self._model:
            return None
        
        try:
            # Run in thread pool (model is CPU-bound)
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                self._model.encode,
                text
            )
            return embedding
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return None
    
    async def add_prompt(self, prompt_hash: str, prompt: str):
        """Add prompt to semantic index"""
        if not self._model:
            return
        
        embedding = await self.get_embedding(prompt)
        if embedding is not None:
            self._embeddings[prompt_hash] = embedding
    
    def remove_prompt(self, prompt_hash: str):
        """Remove prompt from semantic index"""
        if prompt_hash in self._embeddings:
            del self._embeddings[prompt_hash]
    
    async def find_similar(
        self,
        prompt: str,
        exclude_hash: Optional[str] = None,
    ) -> Optional[Tuple[str, float]]:
        """
        Find most similar cached prompt.
        
        Returns:
            Tuple of (prompt_hash, similarity_score) or None
        """
        if not self._model or not self._embeddings:
            return None
        
        query_embedding = await self.get_embedding(prompt)
        if query_embedding is None:
            return None
        
        best_hash = None
        best_similarity = 0.0
        
        for prompt_hash, embedding in self._embeddings.items():
            if exclude_hash and prompt_hash == exclude_hash:
                continue
            
            # Cosine similarity
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
            )
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_hash = prompt_hash
        
        if best_similarity >= self.similarity_threshold:
            return (best_hash, best_similarity)
        
        return None


class MultiLevelCache:
    """
    Multi-level cache manager.
    
    Features:
    - L1 (RAM) + L2 (SQLite) + L3 (File) caching
    - Semantic similarity search
    - Automatic promotion/demotion between levels
    - Prefetching based on patterns
    """
    
    def __init__(
        self,
        l1_size: int = 1000,
        l2_path: str = "./data/cache.db",
        l3_dir: str = "./data/cache_l3",
        default_ttl_seconds: int = 3600,
        enable_semantic_search: bool = True,
    ):
        self.l1 = L1Cache(max_size=l1_size, ttl_seconds=default_ttl_seconds)
        self.l2 = L2Cache(db_path=l2_path, ttl_seconds=default_ttl_seconds * 24)
        self.l3 = L3Cache(cache_dir=l3_dir, ttl_seconds=default_ttl_seconds * 168)  # 7 days
        
        self.default_ttl_seconds = default_ttl_seconds
        
        if enable_semantic_search and EMBEDDINGS_AVAILABLE:
            self.semantic = SemanticCacheSearch()
        else:
            self.semantic = None
        
        self._stats = {
            'total_hits': 0,
            'total_misses': 0,
            'l1_hits': 0,
            'l2_hits': 0,
            'l3_hits': 0,
            'semantic_hits': 0,
        }
    
    @staticmethod
    def hash_prompt(prompt: str) -> str:
        """Generate hash for prompt"""
        return hashlib.sha256(prompt.encode()).hexdigest()
    
    async def get(
        self,
        prompt: str,
        use_semantic: bool = True,
    ) -> Optional[Tuple[str, bool]]:
        """
        Get cached response.
        
        Returns:
            Tuple of (response, is_semantic_match) or None
        """
        prompt_hash = self.hash_prompt(prompt)
        
        # Check L1
        entry = await self.l1.get(prompt_hash)
        if entry:
            self._stats['l1_hits'] += 1
            self._stats['total_hits'] += 1
            return (entry.response, False)
        
        # Check L2
        entry = await self.l2.get(prompt_hash)
        if entry:
            self._stats['l2_hits'] += 1
            self._stats['total_hits'] += 1
            # Promote to L1
            await self.l1.set(entry)
            return (entry.response, False)
        
        # Check L3
        entry = await self.l3.get(prompt_hash)
        if entry:
            self._stats['l3_hits'] += 1
            self._stats['total_hits'] += 1
            # Promote to L2 and L1
            await self.l2.set(entry)
            await self.l1.set(entry)
            return (entry.response, False)
        
        # Semantic search
        if use_semantic and self.semantic:
            similar = await self.semantic.find_similar(prompt, prompt_hash)
            if similar:
                similar_hash, similarity = similar
                
                # Try to get similar entry
                for cache in [self.l1, self.l2, self.l3]:
                    entry = await cache.get(similar_hash)
                    if entry:
                        self._stats['semantic_hits'] += 1
                        self._stats['total_hits'] += 1
                        logger.debug(f"Semantic cache hit (similarity: {similarity:.3f})")
                        return (entry.response, True)
        
        self._stats['total_misses'] += 1
        return None
    
    async def set(
        self,
        prompt: str,
        response: str,
        ttl_seconds: Optional[int] = None,
        model_used: Optional[str] = None,
        response_time: Optional[float] = None,
    ):
        """Cache response"""
        ttl = ttl_seconds or self.default_ttl_seconds
        now = datetime.now()
        
        entry = CacheEntry(
            prompt_hash=self.hash_prompt(prompt),
            prompt=prompt,
            response=response,
            created_at=now,
            expires_at=now + timedelta(seconds=ttl),
            model_used=model_used,
            response_time=response_time,
        )
        
        # Set in all levels
        await self.l1.set(entry)
        await self.l2.set(entry)
        await self.l3.set(entry)
        
        # Add to semantic index
        if self.semantic:
            await self.semantic.add_prompt(entry.prompt_hash, prompt)
    
    async def delete(self, prompt: str):
        """Delete from all cache levels"""
        prompt_hash = self.hash_prompt(prompt)
        
        await self.l1.delete(prompt_hash)
        await self.l2.delete(prompt_hash)
        await self.l3.delete(prompt_hash)
        
        if self.semantic:
            self.semantic.remove_prompt(prompt_hash)
    
    async def clear(self) -> int:
        """Clear all cache levels"""
        l1_count = await self.l1.clear()
        l2_count = await self.l2.clear()
        l3_count = await self.l3.clear()
        
        if self.semantic:
            self.semantic._embeddings.clear()
        
        return l1_count + l2_count + l3_count
    
    async def cleanup(self) -> Dict[str, int]:
        """Cleanup expired entries"""
        l2_expired = await self.l2.cleanup_expired()
        
        # L3 cleanup
        l3_expired = 0
        now = datetime.now()
        for file_path in self.l3.cache_dir.glob("*.json"):
            try:
                async with aiofiles.open(file_path, 'r') as f:
                    data = json.loads(await f.read())
                expires = datetime.fromisoformat(data['expires_at'])
                if now > expires:
                    file_path.unlink()
                    l3_expired += 1
            except:
                pass
        
        return {
            'l2_expired': l2_expired,
            'l3_expired': l3_expired,
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self._stats['total_hits'] + self._stats['total_misses']
        hit_rate = self._stats['total_hits'] / max(1, total)
        
        return {
            **self._stats,
            'hit_rate': hit_rate,
            'semantic_available': self.semantic is not None and self.semantic.is_available(),
        }
    
    async def close(self):
        """Close cache connections"""
        await self.l2.close()
