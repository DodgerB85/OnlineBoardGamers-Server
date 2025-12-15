#!/bin/bash

LOCK_FILE="/app/.setup_complete"

# Check if setup has already run
if [ -f "$LOCK_FILE" ]; then
    echo "Setup already completed. Starting server immediately."
    exec python manage.py runserver 0.0.0.0:8000
fi

# --- If lock file is NOT present, run the setup commands ---

# Wait for DB to be ready
until python manage.py dbshell <<EOF
exit
EOF
do
  echo "Waiting for database connection..."
  sleep 2
done
echo "Database ready."

# --- 2. Run Migrations (removed --noinput) ---
echo "Running migrations..."
python manage.py migrate

# --- 3. Create Superuser (this should work now that DB is fully ready) ---
echo "Creating superuser (if it doesn't exist)..."
python manage.py createsuperuser --noinput --username $DJANGO_SUPERUSER_USERNAME --email $DJANGO_SUPERUSER_EMAIL

# --- 4. Load default users ---
echo "Adding default users via data migration..."
# Ensure you have your initial_users.json file created correctly
python manage.py loaddata initial_users.json

#echo "Setup complete. Starting server..."
# Now start the main application server
#python manage.py runserver 0.0.0.0:8000

# --- Create the lock file and start the server ---
touch "$LOCK_FILE"
echo "Setup complete. Starting server..."
exec python manage.py runserver 0.0.0.0:8000