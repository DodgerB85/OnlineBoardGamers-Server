def base_layout(request):
    """Injects base_template into all template contexts based on the /nd/ design flag."""
    use_new = getattr(request, "use_new_design", False)
    base_template = "Lobby/layout_new.html" if use_new else "Lobby/layout.html"
    # Ensure base_template is never empty (fallback to old layout if somehow unset)
    if not base_template:
        base_template = "Lobby/layout.html"
    return {
        "base_template": base_template,
    }
