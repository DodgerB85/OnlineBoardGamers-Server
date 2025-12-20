
#!/bin/bash
# Define a function to wait for the database
wait_for_db() {
  until python manage.py dbshell <<EOF
exit
EOF
  do
    echo "Waiting for database connection..."
    sleep 2
  done
  echo "Database ready."
}

# --- Main Logic ---
wait_for_db

# Try to sync the auth content types table (a prerequisite for counting users)
# python manage.py makemigrations
python manage.py migrate --no-input

# Get the raw user count using a robust Python one-liner
USER_COUNT=$(python manage.py shell --command="from django.contrib.auth import get_user_model; User = get_user_model(); print(User.objects.count());" | tail -n 1)
echo "Current user count: $USER_COUNT"

# Check if the count is greater than 10
if [ "$USER_COUNT" -gt 10 ]; then
    echo "More than 10 users already exist. Skipping initial setup."
else
    echo "Fewer than 10 users found. Running initial setup (migrations, users, etc)..."
    
    # Run Full Migrations (Fix 3 must be applied locally first)
    #echo "Running migrations..."
    #python manage.py migrate --no-input

    # Create Superuser (non-interactive, using env variables)
    echo "Creating superuser (if it doesn't exist)..."
    python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL

    # Load default users
    echo "Adding default users via data migration..."
    python manage.py loaddata initial_users.json

    echo "Initial setup commands complete."
fi

# --- Start the main server process regardless of setup outcome ---
echo "Setup checks complete. Starting server..."
exec python manage.py runserver 0.0.0.0:8000