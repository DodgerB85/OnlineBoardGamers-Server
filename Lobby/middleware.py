import re

from django.http import HttpResponsePermanentRedirect

# Local-path href/action/src that should be left alone (not prefixed with /nd or /old).
_ND_SKIP_PREFIXES = (
    "/nd/",
    "/old/",
    "/static/",
    "/media/",
    "/favicons/",
    "/admin/",
    "/__debug__/",
)

# Paths that are never user-facing pages and must not be redirected to /nd/.
_NON_PAGE_PREFIXES = _ND_SKIP_PREFIXES + (
    "/jsi18n/",
    "/i18n/",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/apple-touch-icon",
)

# Matches href="/...", action='/...', src=/... etc. Captures attr name, quote, and path.
_ND_ATTR_RE = re.compile(
    rb"""(?P<attr>\b(?:href|action|src|formaction)\s*=\s*)(?P<quote>["'])(?P<path>/(?!/)[^"'#?]*)""",
    re.IGNORECASE,
)

# Matches window.location.href='/...' or window.location='/...' in inline onclick / scripts.
# Captures the prefix (everything up to and including the opening quote) and the path.
_ND_JS_LOCATION_RE = re.compile(
    rb"""(?P<prefix>window\.location(?:\.href)?\s*=\s*)(?P<quote>["'])(?P<path>/(?!/)[^"'#?\\]*)""",
    re.IGNORECASE,
)


def _should_prefix(path_bytes):
    if not path_bytes.startswith(b"/"):
        return False
    # Skip protocol-relative //example.com
    if path_bytes.startswith(b"//"):
        return False
    return all(not path_bytes.startswith(skip.encode("ascii")) for skip in _ND_SKIP_PREFIXES)


def _prefix_design(match, prefix):
    attr = match.group("attr")
    quote = match.group("quote")
    path = match.group("path")
    if not _should_prefix(path):
        return match.group(0)
    return attr + quote + prefix + path


def _prefix_design_js(match, prefix):
    before = match.group("prefix")
    quote = match.group("quote")
    path = match.group("path")
    if not _should_prefix(path):
        return match.group(0)
    return before + quote + prefix + path


def _should_redirect_to_nd(request):
    """Bare page GETs default to the new design by redirecting to /nd/."""
    if request.method != "GET":
        return False
    path = request.path
    if path == "/" or path == "":
        return True
    for skip in _NON_PAGE_PREFIXES:
        if path.startswith(skip):
            return False
    # Never redirect AJAX / JSON / websocket / asset-ish requests
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return False
    if "application/json" in request.headers.get("Accept", ""):
        return False
    if request.headers.get("Upgrade", "").lower() == "websocket":
        return False
    return True


class NewDesignMiddleware:
    """Makes /nd/ (the new design) the default for every page load.

    /nd/... stays sticky for the new design; /old/... is the explicit escape hatch
    back to the legacy design. Any other bare page GET is redirected to /nd/.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path.startswith("/nd/"):
            if not path.endswith("/"):
                return HttpResponsePermanentRedirect(path + "/")
            request.use_new_design = True
            self._strip_prefix(request, "/nd")
        elif path.startswith("/old/"):
            if not path.endswith("/"):
                return HttpResponsePermanentRedirect(path + "/")
            request.use_new_design = False
            self._strip_prefix(request, "/old")
        else:
            request.use_new_design = True
            if _should_redirect_to_nd(request):
                return HttpResponsePermanentRedirect("/nd" + path)

        response = self.get_response(request)

        prefix_str = "/nd" if getattr(request, "use_new_design", True) else "/old"
        prefix_bytes = b"/nd" if getattr(request, "use_new_design", True) else b"/old"
        self._rewrite_location(response, prefix_str)
        self._rewrite_body(response, prefix_bytes)

        return response

    @staticmethod
    def _strip_prefix(request, prefix):
        new_path = request.path[len(prefix) :]  # '/nd/foo/' → '/foo/'
        request.path_info = new_path
        request.path = new_path
        request.META["PATH_INFO"] = new_path

    @staticmethod
    def _rewrite_location(response, prefix):
        location = response.get("Location")
        if not location:
            return
        if location.startswith("/") and not location.startswith("//"):
            for skip in _ND_SKIP_PREFIXES:
                if location.startswith(skip):
                    return
            response["Location"] = prefix + location

    @staticmethod
    def _rewrite_body(response, prefix):
        if response.streaming:
            return
        content_type = response.get("Content-Type", "")
        if "text/html" not in content_type:
            return
        if not getattr(response, "content", None):
            return
        original = response.content
        new_content = _ND_ATTR_RE.sub(lambda m: _prefix_design(m, prefix), original)
        new_content = _ND_JS_LOCATION_RE.sub(lambda m: _prefix_design_js(m, prefix), new_content)
        if new_content == original:
            return
        response.content = new_content
        if response.has_header("Content-Length"):
            response["Content-Length"] = str(len(response.content))


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