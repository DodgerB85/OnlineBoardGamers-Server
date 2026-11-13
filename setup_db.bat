@echo off
echo Running the initial DB setup inside the obs container...
docker compose exec obs sh ./setup_db_script.sh

echo Done!
pause
