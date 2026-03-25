from django.templatetags.static import static
from django.urls import reverse
from jinja2 import Environment
from django.utils.translation import gettext


def environment(**options):
    env = Environment(**options)
    env.globals.update({
        'static': static,
        'url': reverse,
        'gettext': gettext,
        '_': gettext,
    })
    return env
