"""
Core Infrastructure - Django Cache Adapter.
Implements ICacheService using Django's configured cache framework (Redis in production, LocMem in tests).
"""
from typing import Any, Optional
from django.core.cache import cache as default_django_cache
from apps.core.application.ports.cache import ICacheService


class DjangoCacheAdapter(ICacheService):
    """
    Adapter implementing ICacheService.
    Decouples application use cases from direct calls to django.core.cache.cache.
    """

    def __init__(self, cache_backend=None):
        self._cache = cache_backend or default_django_cache

    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)

    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        self._cache.set(key, value, timeout=timeout)

    def delete(self, key: str) -> bool:
        return bool(self._cache.delete(key))

    def exists(self, key: str) -> bool:
        return self._cache.get(key) is not None
