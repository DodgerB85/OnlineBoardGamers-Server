import re

from django.http import HttpResponsePermanentRedirect


# Local-path href/action/src that should be left alone (not prefixed with /nd).
_ND_SKIP_PREFIXES = (
    "/nd/",
    "/static/",
    "/media/",
    "/favicons/",
    "/admin/",
    "/__debug__/",
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
    for skip in _ND_SKIP_PREFIXES:
        if path_bytes.startswith(skip.encode("ascii")):
            return False
    return True


def _prefix_nd(match):
    attr = match.group("attr")
    quote = match.group("quote")
    path = match.group("path")
    if not _should_prefix(path):
        return match.group(0)
    return attr + quote + b"/nd" + path


def _prefix_nd_js(match):
    prefix = match.group("prefix")
    quote = match.group("quote")
    path = match.group("path")
    if not _should_prefix(path):
        return match.group(0)
    return prefix + quote + b"/nd" + path


class NewDesignMiddleware:
    """Intercepts /nd/... paths, sets request.use_new_design=True, strips the prefix,
    and rewrites response href/action/src + Location headers so /nd/ stays sticky."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/nd/'):
            if not request.path.endswith('/'):
                return HttpResponsePermanentRedirect(request.path + '/')
            request.use_new_design = True
            new_path = request.path[3:]  # '/nd/foo/' → '/foo/'
            request.path_info = new_path
            request.path = new_path
            request.META['PATH_INFO'] = new_path
        else:
            request.use_new_design = False

        response = self.get_response(request)

        if getattr(request, "use_new_design", False):
            self._rewrite_location(response)
            self._rewrite_body(response)

        return response

    @staticmethod
    def _rewrite_location(response):
        location = response.get("Location")
        if not location:
            return
        if location.startswith("/") and not location.startswith("//"):
            for skip in _ND_SKIP_PREFIXES:
                if location.startswith(skip):
                    return
            response["Location"] = "/nd" + location

    @staticmethod
    def _rewrite_body(response):
        if response.streaming:
            return
        content_type = response.get("Content-Type", "")
        if "text/html" not in content_type:
            return
        if not getattr(response, "content", None):
            return
        original = response.content
        new_content = _ND_ATTR_RE.sub(_prefix_nd, original)
        new_content = _ND_JS_LOCATION_RE.sub(_prefix_nd_js, new_content)
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
