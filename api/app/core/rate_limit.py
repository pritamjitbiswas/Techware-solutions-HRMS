import redis.asyncio as redis

from app.config import settings


async def check_and_increment(key: str, *, limit: int, window_seconds: int) -> bool:
    """Fixed-window rate limit. Returns True if the caller is within the limit."""
    client = redis.from_url(settings.redis_url)
    try:
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, window_seconds)
        return count <= limit
    finally:
        await client.aclose()


async def reset(key: str) -> None:
    client = redis.from_url(settings.redis_url)
    try:
        await client.delete(key)
    finally:
        await client.aclose()
