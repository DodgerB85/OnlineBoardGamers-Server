@echo off
REM Get the directory where this batch file is located
set "BASE_DIR=%~dp0"

REM Remove trailing backslash for cleaner paths (optional, but useful)
set "BASE_DIR=%BASE_DIR:~0,-1%"

REM Activate the virtual environment (relative to batch location)
call "%BASE_DIR%\.venv\Scripts\activate.bat"

REM Start Django runserver in a new window
start "Django Server" cmd /k python "%BASE_DIR%\manage.py" runserver

REM Start each Vue dev server in its own window, using relative paths
start "CNS Vue" cmd /k cd /d "%BASE_DIR%\CNS\vueCNS" && npm run dev

echo All servers started. Keep these windows open.
echo Close them individually or press Ctrl+C in each to stop.
pause