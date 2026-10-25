from functools import wraps

from django.contrib import messages
from django.core.cache import cache
from django.shortcuts import redirect
from django.utils.translation import gettext


def is_rate_limited(key, limit, window):
    """Count *key* for *window* seconds and report whether *limit* was reached."""
    count = cache.get(key, 0)
    if count >= limit:
        return True
    cache.set(key, count + 1, window)
    return False


def rate_limit(key, limit, window, redirect_to="index"):
    """Throttle POST requests per logged-in user, redirecting with a message."""

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):
            if (
                request.method == "POST"
                and request.user.is_authenticated
                and is_rate_limited(f"{key}:{request.user.id}", limit, window)
            ):
                messages.error(request, gettext("Too many requests. Please try again later."))
                return redirect(redirect_to)
            return view(request, *args, **kwargs)

        return wrapper

    return decorator
