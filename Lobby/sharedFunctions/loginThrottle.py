from django.core.cache import cache

LOGIN_MAX_FAILURES = 10
LOGIN_FAILURE_WINDOW = 15 * 60
LOGIN_FAILURE_KEY = "login_fail:{ip}:{username}"
ADMIN_LOGIN_FAILURE_KEY = "admin_login_fail:{ip}:{username}"


def client_ip(request):
    return request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("REMOTE_ADDR", "")


def failure_key(template, request, username):
    return template.format(ip=client_ip(request), username=(username or "").lower())


def is_locked(key):
    return cache.get(key, 0) >= LOGIN_MAX_FAILURES


def record_failure(key):
    cache.set(key, cache.get(key, 0) + 1, LOGIN_FAILURE_WINDOW)


def clear_failures(key):
    cache.delete(key)
