#!/bin/bash
# initial_db_setup.sh: Creates default data if it doesn't exist.

echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating superuser (if it doesn't exist)..."
# Create a superuser non-interactively using ALL environment variables
python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL

# Check if default users need to be added using a data migration (Recommended way to add default data)
echo "Adding default users via data migration..."
python manage.py loaddata initial_users.json
