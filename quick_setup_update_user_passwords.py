#!/usr/bin/env python
"""Give the initial_users.json users the admin's password hash.

Run after loaddata. The fixture ships placeholder hashes so a production
fixture load cannot create login-able users; this only touches the local
development database. The JSON file is never modified.
"""
import json
import os

import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "OnlineBoardGamers.settings")
django.setup()

from Lobby.models import User


def update_initial_users_password():
    try:
        admin = User.objects.get(username="admin")

        with open("initial_users.json", encoding="utf-8") as f:
            usernames = [user["fields"]["username"] for user in json.load(f)]

        updated = (
            User.objects.filter(username__in=usernames)
            .exclude(pk=admin.pk)
            .update(password=admin.password)
        )
        print(f"Set {updated} initial users' passwords to the admin hash")
        return True

    except User.DoesNotExist:
        print("Error: Admin user not found!")
        return False
    except Exception as e:
        print(f"Error updating passwords: {e}")
        return False


if __name__ == "__main__":
    update_initial_users_password()
