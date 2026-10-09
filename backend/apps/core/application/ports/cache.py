"""
Core Application Port - Cache Service.
Hides Redis/LocMem caching implementation behind a focused key-value caching capability.
Task broker, event pub/sub, and distributed lock concerns are explicitly decoupled.
"""
from typing import Protocol, Any, Optional


class ICacheService(Protocol):
    """
    Port for key-value caching capability.
    Application use cases rely on this capability without knowing whether
    the backing store is Redis, Memcached, or an in-memory test store.
    """

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value by key, or None if not found/expired."""
        ...

    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """Store value with optional TTL expiration in seconds."""
        ...

    def delete(self, key: str) -> bool:
        """Delete key from cache. Returns True if removed, False otherwise."""
        ...

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        ...
