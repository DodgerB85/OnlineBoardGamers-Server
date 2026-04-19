import time
from contextlib import contextmanager

from django.db import IntegrityError, transaction

from Lobby.models import Lock


# 2. THE LOGIC
@contextmanager
def db_mutex(name, timeout=10, ttl=300):
    """
    Database-backed mutex with TTL (Time To Live).

    Args:
        name (str): Unique identifier for the lock.
        timeout (int): How long to wait (retry) to get the lock.
        ttl (int): How long until a lock is considered "stale" and cleared.
    """
    start_time = time.time()
    acquired = False

    while time.time() - start_time < timeout:
        try:
            with transaction.atomic():
                # Try to fetch existing or create new
                lock, created = Lock.objects.get_or_create(name=name)

                if created:
                    acquired = True
                    break

                # SELF-HEALING: If lock exists but is older than TTL, delete it
                if lock.is_expired(ttl):
                    lock.delete()
                    # Continue to next loop iteration to try and 'create' it
                    continue

        except IntegrityError:
            # This happens if another process created the lock
            # between our 'get' and 'create' calls.
            pass

        time.sleep(0.2) # Wait 200ms before retrying

    if not acquired:
        yield False
        return

    try:
        yield True
    finally:
        # RELEASE: Remove the record so others can proceed
        Lock.objects.filter(name=name).delete()
