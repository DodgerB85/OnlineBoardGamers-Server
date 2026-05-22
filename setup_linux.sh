#!/usr/bin/env bash
set -e

echo "Setting up local development environment..."

# Virtual environment
if [ ! -d ".venv_local" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv_local
fi

echo "Installing Python requirements..."
.venv_local/bin/pip install -r requirements.txt
if [ -f "requirements-dev.txt" ]; then
    .venv_local/bin/pip install -r requirements-dev.txt
fi

# .env
if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
        echo "Copying .env.docker to .env..."
        cp .env.docker .env
    else
        echo "Warning: .env.docker not found, creating basic .env..."
        echo -e "DEBUG=True\nLOCAL_USER=True" > .env
    fi
fi

echo "Setting SQLite3 configuration..."
sed -i 's/LOCAL_USER_SQLITE3=False/LOCAL_USER_SQLITE3=True/' .env

# Vue dependencies
for game in AQY/vueAQY BUS/vueBUS CNS/vueCNS KFW/vueKFW TGZ/vueTGZ WEB/vueWEB; do
    if [ -f "$game/package.json" ]; then
        echo "Installing npm dependencies for $game..."
        (cd "$game" && npm install) || echo "Warning: npm install failed for $game"
    fi
done

# Database
echo "Running database migrations..."
.venv_local/bin/python manage.py migrate

echo "Creating superuser..."
export DJANGO_SUPERUSER_USERNAME=admin
export DJANGO_SUPERUSER_EMAIL=admin@admin.com
.venv_local/bin/python manage.py createsuperuser --noinput --username "$DJANGO_SUPERUSER_USERNAME" --email "$DJANGO_SUPERUSER_EMAIL" || echo "Superuser may already exist"

echo "Setting admin password..."
.venv_local/bin/python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'OnlineBoardGamers.settings')
import django
django.setup()
from Lobby.models import User
admin = User.objects.get(username='admin')
admin.set_password('password')
admin.save()
"

echo "Updating initial users password hashes..."
.venv_local/bin/python quick_setup_update_user_passwords.py

echo "Loading initial users..."
.venv_local/bin/python manage.py loaddata initial_users.json

echo ""
echo "=================================================="
echo "Setup complete!"
echo "Run: process-compose up"
echo "=================================================="
