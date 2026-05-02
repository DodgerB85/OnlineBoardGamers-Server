from django.http import HttpResponsePermanentRedirect


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
