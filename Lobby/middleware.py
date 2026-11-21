from django.http import HttpResponse, HttpResponsePermanentRedirect
from Lobby.sharedFunctions.loginThrottle import (
    ADMIN_ACCOUNT_FAILURE_KEY,
    ADMIN_LOGIN_FAILURE_KEY,
    account_failure_key,
    clear_failures,
    failure_key,
    is_locked,
    record_failure,
)


class AdminLoginThrottleMiddleware:
    """Apply the same failed-login budget to the Django admin login."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != "/admin/login/" or request.method != "POST":
            return self.get_response(request)

        key = failure_key(ADMIN_LOGIN_FAILURE_KEY, request, request.POST.get("username", ""))
        account_key = account_failure_key(ADMIN_ACCOUNT_FAILURE_KEY, request.POST.get("username", ""))
        if is_locked(key) or is_locked(account_key):
            return HttpResponse("Too many failed sign-in attempts. Please wait 15 minutes and try again.", status=429)

        response = self.get_response(request)
        if response.status_code == 302:
            clear_failures(key)
            clear_failures(account_key)
        else:
            record_failure(key)
            record_failure(account_key)
        return response


class AuthPageHeadersMiddleware:
    """Keep tokens out of third-party referrers and search indexes on auth pages."""

    AUTH_PREFIXES = ("/login", "/register", "/reset/", "/activate/", "/change-password", "/profile", "/choose-username")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
        if "Permissions-Policy" not in response:
            response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if request.path.startswith(self.AUTH_PREFIXES):
            response["Referrer-Policy"] = "no-referrer"
            response["X-Robots-Tag"] = "noindex, nofollow"
        return response


class ForceTrailingSlashMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # List of prefixes that we know should have trailing slashes
        app_prefixes = (
            "/FCM",
            "/HLC",
            "/BUS",
            "/TGZ",
            "/CNS",
            "/AQY",
            "/IND",
            "/KFW",
            "/PPF",
            "/WEB",
            "/RNB",
            "/URR",
            "/DDL",
            "/ROW",
            "/LBR",
            "/NTR",
            "/login",
            "/profile",
            "/index",
        )

        # Check if the path starts with one of your app prefixes and does NOT end with a slash
        if request.path.startswith(app_prefixes) and not request.path.endswith("/"):
            # Perform a permanent redirect immediately, forcing the slash
            return HttpResponsePermanentRedirect(request.path + "/")

        response = self.get_response(request)
        return response