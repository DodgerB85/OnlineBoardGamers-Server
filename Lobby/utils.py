# Lobby/utils.py
import logging
from django.urls import resolve as django_resolve, Resolver404

logger = logging.getLogger(__name__)  # Lobby.utils


def debug_resolve(path):
    logger.debug(f"Resolver: Attempting to resolve path={path}")
    try:
        result = django_resolve(path)
        logger.debug(
            f"Resolver: Matched path={path}, view={result.func.__name__}, args={result.args}, kwargs={result.kwargs}"
        )
        return result
    except Resolver404 as e:
        logger.debug(f"Resolver: Failed to match path={path}, error={e}")
        raise
