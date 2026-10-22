from django.core.cache import cache


def is_rate_limited(key, limit, window):
    """Count *key* for *window* seconds and report whether *limit* was reached."""
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, window)
    return False
