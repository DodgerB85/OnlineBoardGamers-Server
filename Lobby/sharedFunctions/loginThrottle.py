import ipaddress

from django.core.cache import cache

LOGIN_MAX_FAILURES = 10
LOGIN_FAILURE_WINDOW = 15 * 60
LOGIN_FAILURE_KEY = "login_fail:{ip}:{username}"
LOGIN_ACCOUNT_FAILURE_KEY = "login_fail_account:{username}"
ADMIN_LOGIN_FAILURE_KEY = "admin_login_fail:{ip}:{username}"
ADMIN_ACCOUNT_FAILURE_KEY = "admin_login_fail_account:{username}"


def client_ip(request):
    candidate = request.META.get("HTTP_CF_CONNECTING_IP") or request.META.get("REMOTE_ADDR", "")
    try:
        ipaddress.ip_address(candidate)
    except ValueError:
        candidate = request.META.get("REMOTE_ADDR", "")
    return candidate


def failure_key(template, request, username):
    return template.format(ip=client_ip(request), username=(username or "").lower())


def account_failure_key(template, username):
    """Per-account budget, so a spoofed proxy IP cannot reset the counter."""
    return template.format(username=(username or "").lower())


def is_locked(key):
    return cache.get(key, 0) >= LOGIN_MAX_FAILURES


def record_failure(key):
    cache.set(key, cache.get(key, 0) + 1, LOGIN_FAILURE_WINDOW)


def clear_failures(key):
    cache.delete(key)
