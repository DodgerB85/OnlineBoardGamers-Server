@echo off

echo [1/1] Fixing Linux dependencies (Rollup/Vite)...
docker compose run --rm cns npm install --force --include=optional



echo Done!
pause