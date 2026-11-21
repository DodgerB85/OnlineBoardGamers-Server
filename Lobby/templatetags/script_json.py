import json

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def script_json(value):
    """Render a value as a safe JS/JSON expression.

    ``|safe`` lets a username or client-supplied string close the surrounding
    <script> element. Escaping the HTML-significant characters keeps the value
    valid JSON/JS while preventing a ``</script>`` breakout.
    """
    if value is None or value == "":
        text = "null"
    elif isinstance(value, str):
        try:
            json.loads(value)
            text = value
        except (TypeError, ValueError):
            text = json.dumps(value, ensure_ascii=False)
    else:
        text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    return mark_safe(
        text.replace("&", "\\u0026")
        .replace("<", "\\u003C")
        .replace(">", "\\u003E")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )
