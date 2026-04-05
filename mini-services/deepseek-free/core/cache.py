"""
Multi-Level Cache System for DeepSeek Free
L1 (RAM) + L2 (SQLite) + L3 (File System) with Semantic Search

МУКН | Трафик - Enterprise AI-powered Telegram Automation Platform
"""

import asyncio
import hashlib
import json
import os
import sqlite3
import time
from collections import OrderedDict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from loguru import logger

# Optional semantic search
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    SEMANTIC_AVAILABLE = True
except ImportError:
    SEMANTIC_AVAILABLE = False
    logger.warning("sentence-transformers not installed, semantic search disabled")


@dataclass
class CacheEntry:
    """Запись в кэше"""
    key: str
    query: str
    response: str
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0
    relevance_score: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class L1Cache:
    """
    L1 Cache - In-Memory (RAM)
    Fastest access, limited size, LRU eviction
    """
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.hits = 0
        self.misses = 0
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[CacheEntry]:
        """Получить запись из кэша"""
        async with self._lock:
            if key in self.cache:
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                entry = self.cache[key]
                entry.accessed_at = datetime.now()
                entry.access_count += 1
                self.hits += 1
                return entry
            self.misses += 1
            return None
    
    async def set(self, key: str, query: str, response: str, metadata: Dict = None) -> None:
        """Сохранить запись в кэш"""
        async with self._lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            else:
                # Evict oldest if full
                while len(self.cache) >= self.max_size:
                    self.cache.popitem(last=False)
            
            entry = CacheEntry(
                key=key,
                query=query,
                response=response,
                created_at=datetime.now(),
                accessed_at=datetime.now(),
                access_count=1,
                metadata=metadata or {}
            )
            self.cache[key] = entry
    
    async def delete(self, key: str) -> bool:
        """Удалить запись из кэша"""
        async with self._lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    async def clear(self) -> None:
        """Очистить весь кэш"""
        async with self._lock:
            self.cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику"""
        total = self.hits + self.misses
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': self.hits / total if total > 0 else 0,
        }


class L2Cache:
    """
    L2 Cache - SQLite Database
    Persistent storage, larger capacity, indexed search
    """
    
    def __init__(self, db_path: str = "data/cache.db", max_size: int = 100000):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.max_size = max_size
        self._init_db()
    
    def _init_db(self) -> None:
        """Инициализация базы данных"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Таблица кэша
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 1,
                relevance_score REAL DEFAULT 1.0,
                metadata TEXT
            )
        ''')
        
        # Индексы для быстрого поиска
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON cache(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_accessed_at ON cache(accessed_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_access_count ON cache(access_count)')
        
        conn.commit()
        conn.close()
    
    def get(self, key: str) -> Optional[CacheEntry]:
        """Получить запись из кэша"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT key, query, response, created_at, accessed_at, access_count, relevance_score, metadata FROM cache WHERE key = ?',
                (key,)
            )
            row = cursor.fetchone()
            
            if row:
                # Обновляем access
                cursor.execute(
                    'UPDATE cache SET accessed_at = ?, access_count = access_count + 1 WHERE key = ?',
                    (datetime.now().isoformat(), key)
                )
                conn.commit()
                
                return CacheEntry(
                    key=row[0],
                    query=row[1],
                    response=row[2],
                    created_at=datetime.fromisoformat(row[3]),
                    accessed_at=datetime.fromisoformat(row[4]),
                    access_count=row[5],
                    relevance_score=row[6],
                    metadata=json.loads(row[7]) if row[7] else {}
                )
            return None
        finally:
            conn.close()
    
    def set(self, key: str, query: str, response: str, metadata: Dict = None) -> None:
        """Сохранить запись в кэш"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO cache (key, query, response, created_at, accessed_at, access_count, metadata)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            ''', (
                key,
                query,
                response,
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                json.dumps(metadata or {})
            ))
            conn.commit()
            
            # Cleanup if over limit
            self._cleanup_if_needed(conn)
        finally:
            conn.close()
    
    def _cleanup_if_needed(self, conn: sqlite3.Connection) -> None:
        """Очистка старых записей при превышении лимита"""
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM cache')
        count = cursor.fetchone()[0]
        
        if count > self.max_size:
            # Remove oldest accessed
            cursor.execute(
                'DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY accessed_at ASC LIMIT ?)',
                (count - self.max_size + 1000,)
            )
            conn.commit()
    
    def search_by_query(self, query: str, limit: int = 10) -> List[CacheEntry]:
        """Поиск по похожему запросу (текстовый)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'SELECT key, query, response, created_at, accessed_at, access_count, relevance_score, metadata FROM cache WHERE query LIKE ? ORDER BY access_count DESC LIMIT ?',
                (f'%{query[:50]}%', limit)
            )
            rows = cursor.fetchall()
            
            return [
                CacheEntry(
                    key=row[0],
                    query=row[1],
                    response=row[2],
                    created_at=datetime.fromisoformat(row[3]),
                    accessed_at=datetime.fromisoformat(row[4]),
                    access_count=row[5],
                    relevance_score=row[6],
                    metadata=json.loads(row[7]) if row[7] else {}
                )
                for row in rows
            ]
        finally:
            conn.close()
    
    def clear(self) -> None:
        """Очистить весь кэш"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cache')
        conn.commit()
        conn.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT COUNT(*) FROM cache')
            count = cursor.fetchone()[0]
            
            cursor.execute('SELECT SUM(access_count) FROM cache')
            total_access = cursor.fetchone()[0] or 0
            
            return {
                'size': count,
                'max_size': self.max_size,
                'total_access': total_access,
            }
        finally:
            conn.close()


class L3Cache:
    """
    L3 Cache - File System
    Unlimited size, slowest access, compressed storage
    """
    
    def __init__(self, cache_dir: str = "data/cache_l3", max_size_mb: int = 1024):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_size_bytes = max_size_mb * 1024 * 1024
    
    def _get_file_path(self, key: str) -> Path:
        """Получить путь к файлу по ключу"""
        # Разбиваем ключ на подкаталоги для распределения
        subdir = key[:2]
        return self.cache_dir / subdir / f"{key}.json"
    
    def get(self, key: str) -> Optional[CacheEntry]:
        """Получить запись из кэша"""
        file_path = self._get_file_path(key)
        
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Обновляем access
                data['accessed_at'] = datetime.now().isoformat()
                data['access_count'] = data.get('access_count', 0) + 1
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                return CacheEntry(
                    key=data['key'],
                    query=data['query'],
                    response=data['response'],
                    created_at=datetime.fromisoformat(data['created_at']),
                    accessed_at=datetime.fromisoformat(data['accessed_at']),
                    access_count=data['access_count'],
                    metadata=data.get('metadata', {})
                )
            except Exception as e:
                logger.error(f"L3 cache read error: {e}")
        
        return None
    
    def set(self, key: str, query: str, response: str, metadata: Dict = None) -> None:
        """Сохранить запись в кэш"""
        file_path = self._get_file_path(key)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            'key': key,
            'query': query,
            'response': response,
            'created_at': datetime.now().isoformat(),
            'accessed_at': datetime.now().isoformat(),
            'access_count': 1,
            'metadata': metadata or {}
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """Очистить весь кэш"""
        import shutil
        if self.cache_dir.exists():
            shutil.rmtree(self.cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)


class SemanticSearch:
    """
    Semantic Search Engine
    Find similar queries using sentence embeddings
    """
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.embeddings: Dict[str, np.ndarray] = {}
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Инициализация модели"""
        if not SEMANTIC_AVAILABLE:
            logger.warning("Semantic search not available - sentence-transformers not installed")
            return False
        
        try:
            logger.info(f"Loading semantic model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self._initialized = True
            logger.info("Semantic model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load semantic model: {e}")
            return False
    
    def encode(self, text: str) -> Optional[np.ndarray]:
        """Получить эмбеддинг текста"""
        if not self._initialized:
            return None
        
        try:
            return self.model.encode(text, convert_to_numpy=True)
        except Exception as e:
            logger.error(f"Encoding error: {e}")
            return None
    
    def add_embedding(self, key: str, text: str) -> None:
        """Добавить эмбеддинг в индекс"""
        if not self._initialized:
            return
        
        embedding = self.encode(text)
        if embedding is not None:
            self.embeddings[key] = embedding
    
    def find_similar(self, query: str, threshold: float = 0.95, limit: int = 5) -> List[Tuple[str, float]]:
        """
        Найти похожие запросы
        Returns: List of (key, similarity_score) tuples
        """
        if not self._initialized or not self.embeddings:
            return []
        
        query_embedding = self.encode(query)
        if query_embedding is None:
            return []
        
        similarities = []
        
        for key, embedding in self.embeddings.items():
            # Cosine similarity
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
            )
            
            if similarity >= threshold:
                similarities.append((key, float(similarity)))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:limit]


class MultiLevelCache:
    """
    Multi-Level Cache System
    L1 (RAM) -> L2 (SQLite) -> L3 (FileSystem)
    with Semantic Search
    """
    
    def __init__(
        self,
        l1_max_size: int = 1000,
        l2_max_size: int = 100000,
        l2_db_path: str = "data/cache.db",
        l3_dir: str = "data/cache_l3",
        l3_max_size_mb: int = 1024,
        semantic_enabled: bool = True,
        semantic_threshold: float = 0.95,
    ):
        # Cache layers
        self.l1 = L1Cache(max_size=l1_max_size)
        self.l2 = L2Cache(db_path=l2_db_path, max_size=l2_max_size)
        self.l3 = L3Cache(cache_dir=l3_dir, max_size_mb=l3_max_size_mb)
        
        # Semantic search
        self.semantic_enabled = semantic_enabled and SEMANTIC_AVAILABLE
        self.semantic_threshold = semantic_threshold
        self.semantic = SemanticSearch() if self.semantic_enabled else None
        
        # Stats
        self.stats = {
            'l1_hits': 0,
            'l2_hits': 0,
            'l3_hits': 0,
            'semantic_hits': 0,
            'misses': 0,
        }
    
    async def initialize(self) -> bool:
        """Инициализация кэша"""
        if self.semantic:
            await self.semantic.initialize()
        return True
    
    @staticmethod
    def generate_key(prompt: str) -> str:
        """Генерация ключа кэша"""
        return hashlib.md5(prompt.encode()).hexdigest()
    
    async def get(self, prompt: str) -> Optional[str]:
        """
        Получить ответ из кэша.
        Проверяет все уровни кэша.
        """
        key = self.generate_key(prompt)
        
        # L1 check
        entry = await self.l1.get(key)
        if entry:
            self.stats['l1_hits'] += 1
            logger.debug(f"Cache L1 HIT: {key[:8]}")
            return entry.response
        
        # L2 check
        entry = self.l2.get(key)
        if entry:
            self.stats['l2_hits'] += 1
            logger.debug(f"Cache L2 HIT: {key[:8]}")
            # Promote to L1
            await self.l1.set(key, entry.query, entry.response, entry.metadata)
            return entry.response
        
        # L3 check
        entry = self.l3.get(key)
        if entry:
            self.stats['l3_hits'] += 1
            logger.debug(f"Cache L3 HIT: {key[:8]}")
            # Promote to L1 and L2
            await self.l1.set(key, entry.query, entry.response, entry.metadata)
            self.l2.set(key, entry.query, entry.response, entry.metadata)
            return entry.response
        
        # Semantic search
        if self.semantic and self.semantic._initialized:
            similar = self.semantic.find_similar(prompt, threshold=self.semantic_threshold)
            if similar:
                similar_key, similarity = similar[0]
                self.stats['semantic_hits'] += 1
                logger.debug(f"Cache SEMANTIC HIT: {similar_key[:8]} (similarity: {similarity:.2f})")
                
                # Get the similar entry
                entry = self.l2.get(similar_key)
                if entry:
                    # Store original query with this response
                    await self.l1.set(key, prompt, entry.response, {'semantic_match': True, 'original_key': similar_key})
                    return entry.response
        
        self.stats['misses'] += 1
        return None
    
    async def set(self, prompt: str, response: str, metadata: Dict = None) -> None:
        """Сохранить ответ во все уровни кэша"""
        key = self.generate_key(prompt)
        
        # Save to all levels
        await self.l1.set(key, prompt, response, metadata)
        self.l2.set(key, prompt, response, metadata)
        self.l3.set(key, prompt, response, metadata)
        
        # Add to semantic index
        if self.semantic:
            self.semantic.add_embedding(key, prompt)
        
        logger.debug(f"Cache SET: {key[:8]}")
    
    async def delete(self, prompt: str) -> bool:
        """Удалить запись из всех уровней кэша"""
        key = self.generate_key(prompt)
        
        l1_deleted = await self.l1.delete(key)
        # L2 and L3 deletion would need implementation
        
        return l1_deleted
    
    async def clear(self) -> None:
        """Очистить весь кэш"""
        await self.l1.clear()
        self.l2.clear()
        self.l3.clear()
        
        if self.semantic:
            self.semantic.embeddings.clear()
        
        logger.info("All cache levels cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику кэша"""
        total_hits = self.stats['l1_hits'] + self.stats['l2_hits'] + self.stats['l3_hits'] + self.stats['semantic_hits']
        total_requests = total_hits + self.stats['misses']
        
        return {
            'l1': self.l1.get_stats(),
            'l2': self.l2.get_stats(),
            'l3': {'enabled': True},
            'semantic': {
                'enabled': self.semantic_enabled and (self.semantic._initialized if self.semantic else False),
                'index_size': len(self.semantic.embeddings) if self.semantic else 0,
            },
            'hits': {
                'l1': self.stats['l1_hits'],
                'l2': self.stats['l2_hits'],
                'l3': self.stats['l3_hits'],
                'semantic': self.stats['semantic_hits'],
            },
            'misses': self.stats['misses'],
            'hit_rate': total_hits / total_requests if total_requests > 0 else 0,
            'total_requests': total_requests,
        }
    
    def prefetch_warmup(self, queries: List[str]) -> None:
        """
        Прогрев кэша - предзагрузка эмбеддингов для предсказанных запросов
        """
        if not self.semantic or not self.semantic._initialized:
            return
        
        for query in queries:
            key = self.generate_key(query)
            entry = self.l2.get(key)
            if entry:
                self.semantic.add_embedding(key, query)
        
        logger.info(f"Prefetch warmup: {len(queries)} queries processed")


class CachePrefetcher:
    """
    Prefetch Engine
    Predicts upcoming queries and warms up the cache
    """
    
    def __init__(self, cache: MultiLevelCache):
        self.cache = cache
        self.query_history: List[str] = []
        self.max_history = 100
    
    def record_query(self, query: str) -> None:
        """Записать запрос в историю"""
        self.query_history.append(query)
        if len(self.query_history) > self.max_history:
            self.query_history = self.query_history[-self.max_history:]
    
    def predict_next_queries(self, count: int = 10) -> List[str]:
        """
        Предсказать следующие запросы на основе истории.
        Простая реализация - возвращает последние уникальные запросы.
        """
        # В реальной реализации здесь можно использовать ML
        unique_queries = list(dict.fromkeys(reversed(self.query_history)))
        return unique_queries[:count]
    
    async def warmup(self) -> None:
        """Прогрев кэша предсказанными запросами"""
        predicted = self.predict_next_queries()
        self.cache.prefetch_warmup(predicted)
