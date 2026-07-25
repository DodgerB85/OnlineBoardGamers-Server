def base_layout(request):
    """Injects base_template into all template contexts based on the /nd/ design flag."""
    use_new = getattr(request, "use_new_design", False)
    return {
        "base_template": "Lobby/layout_new.html" if use_new else "Lobby/layout.html",
    }
