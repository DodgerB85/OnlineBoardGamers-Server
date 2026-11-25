#!/bin/sh
set -e

# Runs once per deploy, before obs/worker start. The db service healthcheck
# already waits for MySQL, so a failure here is a real migration error.
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py compress --force
