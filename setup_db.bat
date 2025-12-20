@echo off
SET CONTAINER_NAME=obs

echo [1/2] Setting permissions on the script...
docker compose exec %CONTAINER_NAME% chmod +x /app/setup_db_script.sh

echo [2/2] Running the setup script inside the container...
:: Change "bash" to "sh" below
docker compose exec %CONTAINER_NAME% sh /app/setup_db_script.sh

echo Done!
pause